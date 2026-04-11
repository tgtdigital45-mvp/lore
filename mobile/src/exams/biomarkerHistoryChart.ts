import { canonicalBiomarkerName, parseLabNumericString } from "@/src/exams/biomarkerCanonical";
import { supabase } from "@/src/lib/supabase";

export type RawBiomarkerLog = {
  name: string;
  value_numeric: number | null;
  value_text: string | null;
  logged_at: string;
  medical_document_id: string | null;
};

export type MedicalDocMeta = {
  id: string;
  exam_performed_at: string | null;
  uploaded_at: string;
  document_type: string;
};

function examDateIso(log: RawBiomarkerLog, docMap: Map<string, MedicalDocMeta>): string {
  const d = log.medical_document_id ? docMap.get(log.medical_document_id) : undefined;
  if (!d) return log.logged_at;
  return d.exam_performed_at && String(d.exam_performed_at).trim() !== ""
    ? d.exam_performed_at
    : d.uploaded_at;
}

function chartLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "?";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function numericFromLog(log: RawBiomarkerLog): number | null {
  const v = log.value_numeric != null ? Number(log.value_numeric) : null;
  if (v != null && Number.isFinite(v)) return v;
  return parseLabNumericString(String(log.value_text ?? ""));
}

export type MetricHistoryChartModel =
  | { kind: "empty"; hint: string }
  | { kind: "non_numeric" }
  | { kind: "chart"; data: { value: number; label: string }[]; otherExams: number };

export function buildMetricHistorySeries(
  metricName: string,
  logs: RawBiomarkerLog[],
  docMap: Map<string, MedicalDocMeta>,
  opts: {
    documentType: string;
    currentDocumentId: string;
    /** Valor mostrado neste exame (JSON ou log) para incluir no gráfico quando não há linha em biomarker_logs. */
    currentReading?: { valueText: string; examDateIso: string };
  }
): MetricHistoryChartModel {
  const canon = canonicalBiomarkerName(metricName);
  const matched = logs.filter((r) => {
    if (canonicalBiomarkerName(r.name) !== canon) return false;
    if (!r.medical_document_id) return false;
    const doc = docMap.get(r.medical_document_id);
    if (!doc || doc.document_type !== opts.documentType) return false;
    return true;
  });

  const byDoc = new Map<string, RawBiomarkerLog>();
  for (const r of matched) {
    const docId = r.medical_document_id!;
    const prev = byDoc.get(docId);
    if (!prev || new Date(r.logged_at).getTime() > new Date(prev.logged_at).getTime()) {
      byDoc.set(docId, r);
    }
  }

  const sorted = [...byDoc.values()].sort(
    (a, b) => new Date(examDateIso(a, docMap)).getTime() - new Date(examDateIso(b, docMap)).getTime()
  );

  type Timed = { t: number; value: number; label: string };
  const timed: Timed[] = [];
  for (const r of sorted) {
    const v = numericFromLog(r);
    if (v == null || !Number.isFinite(v)) continue;
    const iso = examDateIso(r, docMap);
    timed.push({ t: new Date(iso).getTime(), value: v, label: chartLabel(iso) });
  }

  const hasCurrentLog = sorted.some((r) => r.medical_document_id === opts.currentDocumentId);
  if (!hasCurrentLog && opts.currentReading) {
    const v = parseLabNumericString(opts.currentReading.valueText);
    if (v != null && Number.isFinite(v)) {
      const iso = opts.currentReading.examDateIso;
      timed.push({ t: new Date(iso).getTime(), value: v, label: chartLabel(iso) });
    }
  }

  timed.sort((a, b) => a.t - b.t);

  if (timed.length === 0) {
    if (matched.length === 0) {
      return {
        kind: "empty",
        hint: "Ainda não há outros exames deste tipo com esta métrica na app.",
      };
    }
    return { kind: "non_numeric" };
  }

  const otherExams = new Set(
    matched.filter((r) => r.medical_document_id !== opts.currentDocumentId).map((r) => r.medical_document_id)
  ).size;

  let data = timed.map((x) => ({ value: x.value, label: x.label }));
  if (data.length === 1) {
    data = [data[0], { ...data[0] }];
  }

  return { kind: "chart", data, otherExams };
}

export async function fetchBiomarkerHistoryContext(patientId: string): Promise<{
  logs: RawBiomarkerLog[];
  docMap: Map<string, MedicalDocMeta>;
}> {
  const { data: logs, error } = await supabase
    .from("biomarker_logs")
    .select("name, value_numeric, value_text, logged_at, medical_document_id")
    .eq("patient_id", patientId)
    .not("medical_document_id", "is", null)
    .order("logged_at", { ascending: true })
    .limit(4000);

  if (error || !logs?.length) {
    return { logs: [], docMap: new Map() };
  }

  const raw = logs as RawBiomarkerLog[];
  const ids = [...new Set(raw.map((l) => l.medical_document_id).filter((x): x is string => !!x))];
  if (ids.length === 0) {
    return { logs: raw, docMap: new Map() };
  }

  const { data: docs } = await supabase
    .from("medical_documents")
    .select("id, exam_performed_at, uploaded_at, document_type")
    .eq("patient_id", patientId)
    .in("id", ids);

  const docMap = new Map<string, MedicalDocMeta>();
  for (const d of docs ?? []) {
    docMap.set(d.id, d as MedicalDocMeta);
  }
  return { logs: raw, docMap };
}
