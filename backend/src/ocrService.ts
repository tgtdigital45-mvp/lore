import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "./config.js";
import { canonicalBiomarkerName, parseLabNumericString } from "./biomarkerCanonical.js";
import { extFromMime, isR2Configured, putExamObject } from "./r2.js";
import type { DocumentSuitability, OcrStructured } from "./ocrGemini.js";
import { runOcrVision } from "./ocrVision.js";

/** Imagem ou ficheiro recusado pela triagem (não clínico / pessoal). */
export class OcrRejectedNotMedical extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OcrRejectedNotMedical";
  }
}

export type OcrAnalyzeInput = {
  imageBase64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "application/pdf";
  /** Se omitido, a IA classifica o documento (blood_test | biopsy | scan). */
  documentType?: "blood_test" | "biopsy" | "scan";
};

export type OcrAnalyzeResult = {
  extracted: OcrStructured;
  documentId: string;
};

/** Converte YYYY-MM-DD da IA em timestamptz UTC (meio-dia) para o gráfico e listas. */
function resolveStorageDocumentType(
  hint: OcrAnalyzeInput["documentType"],
  inferred: "blood_test" | "biopsy" | "scan",
  suitability: DocumentSuitability
): "blood_test" | "biopsy" | "scan" | "administrative" {
  if (suitability === "administrative_insurance") return "administrative";
  return hint ?? inferred;
}

function parseExamDateIsoToTimestamp(iso: string | undefined): string | null {
  if (!iso || typeof iso !== "string") return null;
  const s = iso.trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < 1980 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}T12:00:00.000Z`;
}

async function runOcrPipelineForPatientId(
  env: Env,
  supabase: SupabaseClient,
  patientId: string,
  input: OcrAnalyzeInput
): Promise<OcrAnalyzeResult> {
  const { structured: extracted, document_kind: inferredKind, document_suitability } = await runOcrVision(
    env,
    input.mimeType,
    input.imageBase64,
    {
      hintDocumentType: input.documentType,
    }
  );

  if (document_suitability === "not_medical") {
    const msg =
      extracted.confidence_note?.trim() ||
      extracted.summary_pt_br?.trim() ||
      "Esta imagem não parece ser um exame ou documento clínico. Envie uma foto nítida do laudo ou resultado.";
    throw new OcrRejectedNotMedical(msg);
  }

  const resolvedDocType = resolveStorageDocumentType(input.documentType, inferredKind, document_suitability);

  const docId = randomUUID();
  const ext = extFromMime(input.mimeType);
  let storagePath = `inline-ocr/${docId}`;

  if (isR2Configured(env)) {
    const r2Path = `patients/${patientId}/exams/${docId}.${ext}`;
    try {
      const buf = Buffer.from(input.imageBase64, "base64");
      await putExamObject(env, r2Path, buf, input.mimeType);
      storagePath = r2Path;
    } catch (e) {
      console.error("[ocr] R2 upload failed; gravando só metadados (inline-ocr):", e instanceof Error ? e.message : e);
      storagePath = `inline-ocr/${docId}`;
    }
  }

  const examPerformedAt = parseExamDateIsoToTimestamp(extracted.exam_date_iso);

  const aiPayload = {
    summary_pt_br: extracted.summary_pt_br,
    exam_date_iso: extracted.exam_date_iso,
    confidence_note: extracted.confidence_note,
    title_pt_br: extracted.title_pt_br,
    doctor_name: extracted.doctor_name,
    markers: extracted.markers,
    metrics: extracted.metrics,
    document_suitability,
    ui_category: extracted.ui_category,
  };

  const { data: row, error: insErr } = await supabase
    .from("medical_documents")
    .insert({
      id: docId,
      patient_id: patientId,
      storage_path: storagePath,
      document_type: resolvedDocType,
      mime_type: input.mimeType,
      exam_performed_at: examPerformedAt,
      ai_extracted_json: aiPayload as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  if (insErr) throw insErr;

  if (extracted.metrics.length > 0) {
    const loggedAt = examPerformedAt ?? new Date().toISOString();
    const rows = extracted.metrics.map((m) => ({
      patient_id: patientId,
      medical_document_id: docId,
      name: canonicalBiomarkerName(m.name),
      value_text: m.value,
      value_numeric: parseLabNumericString(m.value),
      unit: m.unit || null,
      is_abnormal: m.is_abnormal,
      reference_alert: m.reference_alert?.trim() ? m.reference_alert.trim() : null,
      logged_at: loggedAt,
    }));
    const { error: bioErr } = await supabase.from("biomarker_logs").insert(rows);
    if (bioErr) {
      console.error("[ocr] biomarker_logs insert:", bioErr.message, bioErr);
    }
  }

  return {
    extracted,
    documentId: row.id,
  };
}

export async function handleOcrAnalyze(
  env: Env,
  supabase: SupabaseClient,
  userId: string,
  input: OcrAnalyzeInput
): Promise<OcrAnalyzeResult> {
  const { data: patient, error: pErr } = await supabase.from("patients").select("id").eq("profile_id", userId).maybeSingle();

  if (pErr) throw pErr;
  if (!patient) {
    throw new Error("patient_required");
  }

  return runOcrPipelineForPatientId(env, supabase, patient.id, input);
}

/** Equipe hospitalar anexa exame ao prontuário (RLS + policy staff). */
export async function handleStaffOcrForPatient(
  env: Env,
  supabase: SupabaseClient,
  staffUserId: string,
  patientId: string,
  input: OcrAnalyzeInput
): Promise<OcrAnalyzeResult> {
  const { data: patient, error: pErr } = await supabase.from("patients").select("id, hospital_id").eq("id", patientId).maybeSingle();
  if (pErr) throw pErr;
  if (!patient?.hospital_id) throw new Error("patient_not_found");

  const { data: assign, error: aErr } = await supabase
    .from("staff_assignments")
    .select("id")
    .eq("staff_id", staffUserId)
    .eq("hospital_id", patient.hospital_id)
    .maybeSingle();
  if (aErr) throw aErr;
  if (!assign) throw new Error("forbidden");

  return runOcrPipelineForPatientId(env, supabase, patient.id, input);
}
