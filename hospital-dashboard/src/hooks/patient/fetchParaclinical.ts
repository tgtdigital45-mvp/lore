import { supabase } from "@/lib/supabase";
import type {
  BiomarkerModalRow,
  MedicalDocModalRow,
  MedicationLogRow,
  MedicationRow,
} from "@/types/dashboard";

/** Uma única rodada de queries para exames + medicamentos (evita duplicação com reloadExames). */
export async function fetchParaclinical(pid: string): Promise<{
  biomarkers: BiomarkerModalRow[];
  medicalDocs: MedicalDocModalRow[];
  medicationLogs: MedicationLogRow[];
  medications: MedicationRow[];
}> {
  const [bio, mdocs, medLogs, medCatalog] = await Promise.all([
    supabase
      .from("biomarker_logs")
      .select(
        "id, medical_document_id, name, value_numeric, value_text, unit, is_abnormal, reference_range, reference_alert, logged_at, is_critical, critical_low, critical_high, evaluation_type, response_category"
      )
      .eq("patient_id", pid)
      .order("logged_at", { ascending: false })
      .limit(60),
    supabase
      .from("medical_documents")
      .select("id, document_type, uploaded_at, exam_performed_at, storage_path, mime_type, ai_extracted_json")
      .eq("patient_id", pid)
      .order("uploaded_at", { ascending: false })
      .limit(40),
    supabase
      .from("medication_logs")
      .select(
        "id, medication_id, patient_id, taken_at, scheduled_time, taken_time, quantity, status, notes, created_at, medications ( name, dosage )"
      )
      .eq("patient_id", pid)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("medications")
      .select("id, name, display_name, dosage, form, unit, frequency_hours, repeat_mode, anchor_at, end_date, active, notes, pinned")
      .eq("patient_id", pid)
      .order("name"),
  ]);

  const biomarkers =
    !bio.error && bio.data
      ? (bio.data as Record<string, unknown>[]).map((row) => ({
          ...row,
          medical_document_id: (row.medical_document_id as string | null | undefined) ?? null,
        })) as BiomarkerModalRow[]
      : [];

  return {
    biomarkers,
    medicalDocs: !mdocs.error && mdocs.data ? (mdocs.data as MedicalDocModalRow[]) : [],
    medicationLogs: !medLogs.error && medLogs.data ? (medLogs.data as MedicationLogRow[]) : [],
    medications: !medCatalog.error && medCatalog.data ? (medCatalog.data as MedicationRow[]) : [],
  };
}
