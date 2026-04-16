import { supabase } from "@/src/lib/supabase";
import { canonicalBiomarkerName } from "@/src/exams/biomarkerCanonical";
import { parseHomeSummaryRpcPayload } from "@/src/home/parseHomeSummaryRpc";
import { normalizeBiomarkerKey } from "@/src/home/resumoWidgets";
import type { PatientRow } from "@/src/hooks/usePatient";
import type {
  BiomarkerLatest,
  HomeSummarySnapshot,
  NextAppointmentSnippet,
  SymptomSnippet,
} from "@/src/home/homeSummaryTypes";
import { setRpcFallbackTag } from "@/src/lib/sentry";
import type { TreatmentCycleRow } from "@/src/types/treatment";
import type { NutritionLogRow, VitalLogRow, VitalType } from "@/src/types/vitalsNutrition";

function assertNoError(label: string, error: { message: string } | null) {
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

/**
 * Fallback: mesmas leituras em paralelo (várias idas ao PostgREST) quando a RPC falha ou o payload é inválido.
 */
export async function fetchHomeSummarySnapshotParallel(patient: PatientRow): Promise<HomeSummarySnapshot> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  let profileName = "";
  let profileAvatarUrl: string | null = null;
  if (uid) {
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", uid)
      .maybeSingle();
    assertNoError("profiles", profErr);
    profileName = typeof prof?.full_name === "string" ? prof.full_name : "";
    const au = prof && typeof (prof as { avatar_url?: unknown }).avatar_url === "string" ? (prof as { avatar_url: string }).avatar_url : null;
    profileAvatarUrl = au;
  }

  const nowIso = new Date().toISOString();
  const [
    cRes,
    bioRes,
    symRes,
    bioDocRes,
    anyDocRes,
    vitalRes,
    nutrRes,
    apptRes,
  ] = await Promise.all([
    supabase
      .from("treatment_cycles")
      .select(
        "id, protocol_id, protocol_name, start_date, end_date, status, treatment_kind, notes, planned_sessions, completed_sessions, last_session_at, last_weight_kg, infusion_interval_days"
      )
      .eq("patient_id", patient.id)
      .eq("status", "active")
      .order("start_date", { ascending: false })
      .limit(1),
    supabase
      .from("biomarker_logs")
      .select("name, value_numeric, value_text, unit, logged_at")
      .eq("patient_id", patient.id)
      .order("logged_at", { ascending: false })
      .limit(400),
    supabase
      .from("symptom_logs")
      .select("id, entry_kind, symptom_category, severity, pain_level, nausea_level, fatigue_level, body_temperature, logged_at")
      .eq("patient_id", patient.id)
      .order("logged_at", { ascending: false })
      .limit(200),
    supabase.from("medical_documents").select("id").eq("patient_id", patient.id).eq("document_type", "biopsy").limit(1),
    supabase.from("medical_documents").select("document_type, uploaded_at").eq("patient_id", patient.id).order("uploaded_at", { ascending: false }).limit(1),
    supabase.from("vital_logs").select("*").eq("patient_id", patient.id).order("logged_at", { ascending: false }).limit(300),
    supabase.from("nutrition_logs").select("*").eq("patient_id", patient.id).order("logged_at", { ascending: false }).limit(500),
    supabase
      .from("patient_appointments")
      .select("title, kind, starts_at")
      .eq("patient_id", patient.id)
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(24),
  ]);

  assertNoError("treatment_cycles", cRes.error);
  assertNoError("biomarker_logs", bioRes.error);
  assertNoError("symptom_logs", symRes.error);
  assertNoError("medical_documents (biopsy)", bioDocRes.error);
  assertNoError("medical_documents", anyDocRes.error);
  assertNoError("vital_logs", vitalRes.error);
  assertNoError("nutrition_logs", nutrRes.error);
  assertNoError("patient_appointments", apptRes.error);

  const cycles = cRes.data;
  const bioRows = bioRes.data;
  const symRows = symRes.data;
  const bioDoc = bioDocRes.data;
  const anyDoc = anyDocRes.data;
  const vitalRows = vitalRes.data;
  const nutrRows = nutrRes.data;
  const apptRows = apptRes.data;

  const activeCycle = (Array.isArray(cycles) && cycles[0] ? cycles[0] : null) as TreatmentCycleRow | null;
  const hasBiopsy = !!(bioDoc && bioDoc.length > 0);
  const lastDoc = anyDoc && anyDoc[0] ? (anyDoc[0] as { document_type: string; uploaded_at: string }) : null;

  let latestSymptom: SymptomSnippet | null = null;
  if (symRows && symRows[0]) {
    latestSymptom = symRows[0] as SymptomSnippet;
  }

  const bioMap = new Map<string, BiomarkerLatest>();
  if (bioRows) {
    for (const r of bioRows as {
      name: string;
      value_numeric: number | null;
      value_text: string | null;
      unit: string | null;
      logged_at: string;
    }[]) {
      const canon = canonicalBiomarkerName(r.name);
      const key = normalizeBiomarkerKey(canon);
      if (bioMap.has(key)) continue;
      let display = "";
      if (r.value_numeric != null && Number.isFinite(Number(r.value_numeric))) {
        display = String(r.value_numeric);
      } else if (r.value_text != null && String(r.value_text).trim() !== "") {
        display = String(r.value_text).trim();
      } else {
        continue;
      }
      bioMap.set(key, { name: canon, value: display, unit: r.unit, logged_at: r.logged_at });
    }
  }

  const symMap = new Map<string, SymptomSnippet>();
  if (symRows) {
    for (const r of symRows as SymptomSnippet[]) {
      const cat = r.symptom_category;
      if (cat && !symMap.has(cat)) symMap.set(cat, r);
    }
  }

  const vitalMap = new Map<VitalType, VitalLogRow>();
  if (vitalRows) {
    for (const r of vitalRows as VitalLogRow[]) {
      const t = r.vital_type;
      if (!vitalMap.has(t)) vitalMap.set(t, r);
    }
  }

  const upcoming = (apptRows ?? []) as { title: string; kind: string; starts_at: string }[];
  const pick = upcoming[0];
  const k = pick?.kind;
  let nextAppointment: NextAppointmentSnippet | null = null;
  if (pick && (k === "consult" || k === "exam" || k === "other" || k === "infusion")) {
    nextAppointment = { title: pick.title, starts_at: pick.starts_at, kind: k };
  }

  return {
    profileName,
    profileAvatarUrl,
    activeCycle,
    biomarkerByNormEntries: [...bioMap.entries()],
    lastBySymptomEntries: [...symMap.entries()],
    latestVitalByTypeEntries: [...vitalMap.entries()],
    nutritionRows: (nutrRows ?? []) as NutritionLogRow[],
    hasBiopsy,
    lastDoc,
    latestSymptom,
    nextAppointment,
  };
}

/**
 * Tenta `rpc_mobile_home_summary` (1 RTT); se falhar, usa leituras paralelas e regista métrica de fallback (Sentry).
 */
export async function fetchHomeSummarySnapshot(patient: PatientRow): Promise<HomeSummarySnapshot> {
  try {
    const { data, error } = await supabase.rpc("rpc_mobile_home_summary", { p_patient_id: patient.id });
    if (!error && data != null) {
      const parsed = parseHomeSummaryRpcPayload(data);
      if (parsed) return parsed;
    }
  } catch {
    // rede / função ausente em builds antigas
  }
  setRpcFallbackTag();
  return fetchHomeSummarySnapshotParallel(patient);
}
