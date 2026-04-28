import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { refreshSupabaseSessionIfStale } from "../lib/authSession";
import { sanitizeSupabaseError } from "../lib/errorMessages";
import { ensureStaffIfPending } from "../staffLink";
import { mergeAlertRulesFromAssignments, patientClinicalAlert, symptomLogTriageRank } from "../lib/triage";
import { riskFromRank } from "../lib/riskUi";
import { calculateSuspensionRisk } from "../lib/suspensionRisk";
import { supabase } from "../lib/supabase";
import type {
  BiomarkerModalRow,
  HeuristicRule,
  HospitalEmbed,
  HospitalMetaRow,
  PatientRow,
  PendingStaffLinkRequest,
  RiskRow,
  SymptomLogDetail,
  SymptomLogTriage,
  MergedAlertRules,
  VitalLogRow,
  WearableSampleRow,
} from "../types/dashboard";

export type TriageStaffProfile = {
  full_name: string;
  role: string;
  avatar_url: string | null;
  professional_license: string | null;
  specialty: string | null;
};

export type TriageBundle = {
  loadError: string | null;
  rows: RiskRow[];
  pendingLinkRequests: PendingStaffLinkRequest[];
  triageRules: MergedAlertRules;
  hospitalNames: string[];
  hospitalsMeta: HospitalMetaRow[];
  realtimeHospitalKey: string;
  staffProfile: TriageStaffProfile | null;
};

const TRIAGE_STALE_MS = 3 * 60 * 1000;
const TRIAGE_GC_MS = 10 * 60 * 1000;
const TRIAGE_REFETCH_MS = 45_000;

type HospitalJoinRow = {
  name?: string;
  alert_rules?: unknown;
  logo_url?: string | null;
  brand_color_hex?: string | null;
  display_name?: string | null;
  triage_config?: unknown;
  integration_settings?: unknown;
  alert_webhook_url?: string | null;
  fhir_export_enabled?: boolean | null;
};

/**
 * Carrega o bundle de triagem (hospitais, pedidos pendentes, pacientes, sintomas, heurísticas).
 * Usado por TanStack Query — sem setState.
 */
export async function fetchTriageBundle(_session: Session): Promise<TriageBundle> {
  const empty = (loadError: string | null): TriageBundle => ({
    loadError,
    rows: [],
    pendingLinkRequests: [],
    triageRules: { fever_celsius_min: 37.8, alert_window_hours: 72 },
    hospitalNames: [],
    hospitalsMeta: [],
    realtimeHospitalKey: "",
    staffProfile: null,
  });

  const { data: auth } = await supabase.auth.getSession();
  const fresh = await refreshSupabaseSessionIfStale(auth.session);
  if (!fresh?.user) {
    return empty(null);
  }
  const uid = fresh.user.id;

  await ensureStaffIfPending();

  const staffSelect =
    "hospital_id, hospitals ( name, alert_rules, logo_url, brand_color_hex, display_name, triage_config, integration_settings, alert_webhook_url, fhir_export_enabled )";

  const [{ data: assigns, error: aErr }, { data: profileRow, error: profileErr }] = await Promise.all([
    supabase.from("staff_assignments").select(staffSelect),
    supabase
      .from("profiles")
      .select("full_name, role, avatar_url, professional_license, specialty")
      .eq("id", uid)
      .single(),
  ]);

  let staffProfile: TriageStaffProfile | null = null;
  if (!profileErr && profileRow) {
    staffProfile = {
      full_name: profileRow.full_name ?? "",
      role: profileRow.role ?? "",
      avatar_url: typeof profileRow.avatar_url === "string" ? profileRow.avatar_url : null,
      professional_license:
        typeof profileRow.professional_license === "string" ? profileRow.professional_license : null,
      specialty: typeof profileRow.specialty === "string" ? profileRow.specialty : null,
    };
  }

  if (aErr) {
    return {
      ...empty(sanitizeSupabaseError(aErr)),
      staffProfile,
    };
  }
  if (!assigns?.length) {
    return {
      ...empty("Nenhuma lotação hospitalar para este usuário. Peça inclusão em staff_assignments."),
      staffProfile,
    };
  }

  const rules = mergeAlertRulesFromAssignments(assigns as { hospitals?: HospitalEmbed | HospitalEmbed[] | null }[]);

  const metaMap = new Map<string, HospitalMetaRow>();
  const names = new Set<string>();
  for (const row of assigns as {
    hospital_id: string;
    hospitals?: HospitalJoinRow | HospitalJoinRow[] | null;
  }[]) {
    const h = row.hospitals;
    const list = !h ? [] : Array.isArray(h) ? h : [h];
    for (const x of list) {
      if (!x) continue;
      if (x.name) names.add(x.name);
      const ar = x.alert_rules;
      const rulesObj =
        typeof ar === "object" && ar !== null && !Array.isArray(ar) ? { ...(ar as Record<string, unknown>) } : {};
      const triageCfg =
        typeof x.triage_config === "object" && x.triage_config !== null && !Array.isArray(x.triage_config)
          ? { ...(x.triage_config as Record<string, unknown>) }
          : {};
      const ir = x.integration_settings;
      const integration_settings =
        typeof ir === "object" && ir !== null && !Array.isArray(ir) ? { ...(ir as Record<string, unknown>) } : {};
      metaMap.set(row.hospital_id, {
        id: row.hospital_id,
        name: String(x.name ?? "Hospital"),
        alert_rules: rulesObj,
        logo_url: x.logo_url ?? null,
        brand_color_hex: x.brand_color_hex ?? null,
        display_name: x.display_name ?? null,
        triage_config: triageCfg,
        integration_settings,
        alert_webhook_url: x.alert_webhook_url ?? null,
        fhir_export_enabled: Boolean(x.fhir_export_enabled),
      });
    }
  }

  const hospitalNames = [...names];
  const hospitalIds = [...new Set(assigns.map((a) => a.hospital_id))];
  const realtimeHospitalKey = hospitalIds.slice().sort().join(",");
  const hospitalsMeta = [...metaMap.values()];

  // Busca pedidos pendentes e links aprovados em paralelo — ambos dependem
  // apenas de hospitalIds (já disponível), então podem rodar simultaneamente.
  const [{ data: pendingRaw, error: pendErr }, { data: approvedLinks, error: linkErr }] =
    await Promise.all([
      supabase
        .from("patient_hospital_links")
        .select(
          `id, patient_id, hospital_id, requested_at,
        patients ( patient_code, profiles!patients_profile_id_fkey ( full_name ) )`
        )
        .in("hospital_id", hospitalIds)
        .eq("status", "pending")
        .not("requested_by", "is", null)
        .order("requested_at", { ascending: false }),
      supabase
        .from("patient_hospital_links")
        .select("patient_id")
        .in("hospital_id", hospitalIds)
        .eq("status", "approved")
        .not("requested_by", "is", null),
    ]);

  if (pendErr) {
    return {
      loadError: sanitizeSupabaseError(pendErr),
      rows: [],
      pendingLinkRequests: [],
      triageRules: rules,
      hospitalNames,
      hospitalsMeta,
      realtimeHospitalKey,
      staffProfile,
    };
  }

  const mappedPending: PendingStaffLinkRequest[] = (pendingRaw ?? []).map((raw) => {
    const pr = raw as {
      id: string;
      patient_id: string;
      hospital_id: string;
      requested_at: string;
      patients:
        | { patient_code?: string | null; profiles?: { full_name?: string | null } | { full_name?: string | null }[] | null }
        | { patient_code?: string | null; profiles?: { full_name?: string | null } | { full_name?: string | null }[] | null }[]
        | null;
    };
    const p0 = Array.isArray(pr.patients) ? pr.patients[0] : pr.patients;
    const prof = p0?.profiles;
    const prof0 = Array.isArray(prof) ? prof[0] : prof;
    return {
      id: pr.id,
      patient_id: pr.patient_id,
      hospital_id: pr.hospital_id,
      requested_at: pr.requested_at,
      patient_code: (p0?.patient_code ?? "").trim(),
      patient_name: (prof0?.full_name ?? "").trim(),
    };
  });

  if (linkErr) {
    return {
      loadError: sanitizeSupabaseError(linkErr),
      rows: [],
      pendingLinkRequests: mappedPending,
      triageRules: rules,
      hospitalNames,
      hospitalsMeta,
      realtimeHospitalKey,
      staffProfile,
    };
  }

  const linkedPatientIds = [...new Set((approvedLinks ?? []).map((r) => r.patient_id))];

  if (linkedPatientIds.length === 0) {
    return {
      loadError: null,
      rows: [],
      pendingLinkRequests: mappedPending,
      triageRules: rules,
      hospitalNames,
      hospitalsMeta,
      realtimeHospitalKey,
      staffProfile,
    };
  }

  const { data: linkedPatients, error: lpErr } = await supabase
    .from("patients")
    .select(
      "id, profile_id, primary_cancer_type, current_stage, is_in_nadir, patient_code, profiles!patients_profile_id_fkey ( full_name, date_of_birth, avatar_url, phone_e164, whatsapp_opt_in_at, whatsapp_opt_in_revoked_at )"
    )
    .in("id", linkedPatientIds);

  if (lpErr) {
    return {
      loadError: sanitizeSupabaseError(lpErr),
      rows: [],
      pendingLinkRequests: mappedPending,
      triageRules: rules,
      hospitalNames,
      hospitalsMeta,
      realtimeHospitalKey,
      staffProfile,
    };
  }

  const plist = ((linkedPatients ?? []) as unknown as PatientRow[]).filter(
    (p) => (p.patient_code?.trim()?.length ?? 0) > 0
  );

  if (plist.length === 0) {
    return {
      loadError: null,
      rows: [],
      pendingLinkRequests: mappedPending,
      triageRules: rules,
      hospitalNames,
      hospitalsMeta,
      realtimeHospitalKey,
      staffProfile,
    };
  }

  const nowMs = Date.now();
  const fetchHours = Math.max(168, rules.alert_window_hours);
  const sinceFetch = new Date(nowMs - fetchHours * 3600 * 1000);
  const sinceRiskMs = nowMs - 168 * 3600 * 1000;

  const ids = plist.map((p) => p.id);
  const { data: logs, error: lErr } = await supabase
    .from("symptom_logs")
    .select(
      "patient_id, severity, logged_at, symptom_category, body_temperature, entry_kind, pain_level, nausea_level, fatigue_level, ae_max_grade, triage_semaphore, notes"
    )
    .in("patient_id", ids)
    .gte("logged_at", sinceFetch.toISOString());

  if (lErr) {
    return {
      loadError: sanitizeSupabaseError(lErr),
      rows: [],
      pendingLinkRequests: mappedPending,
      triageRules: rules,
      hospitalNames,
      hospitalsMeta,
      realtimeHospitalKey,
      staffProfile,
    };
  }

  const logRows = (logs ?? []) as SymptomLogTriage[];

  const since48Iso = new Date(nowMs - 48 * 3600 * 1000).toISOString();
  const since7dIso = new Date(nowMs - 7 * 86400000).toISOString();
  const since14dIso = new Date(nowMs - 14 * 86400000).toISOString();
  const vitalsCap = Math.min(120 * ids.length, 8000);
  const wearCap = Math.min(500 * ids.length, 20000);
  const bioCap = Math.min(200 * ids.length, 16000);

  const [
    { data: heuristicRows, error: hrErr },
    { data: allBiomarkers, error: bioErr },
    { data: allVitals, error: vBatchErr },
    { data: allWear, error: wBatchErr },
  ] = await Promise.all([
    supabase
      .from("heuristic_rules")
      .select("id, category, rule_name, condition_json, points, time_window_hours, priority, description, is_active")
      .eq("is_active", true)
      .order("priority", { ascending: false }),
    supabase
      .from("biomarker_logs")
      .select(
        "id, patient_id, medical_document_id, name, value_numeric, value_text, unit, is_abnormal, reference_range, reference_alert, logged_at, is_critical, critical_low, critical_high, evaluation_type, response_category"
      )
      .in("patient_id", ids)
      .gte("logged_at", since7dIso)
      .order("logged_at", { ascending: false })
      .limit(bioCap),
    supabase
      .from("vital_logs")
      .select("id, patient_id, logged_at, vital_type, value_numeric, value_systolic, value_diastolic, unit, notes")
      .in("patient_id", ids)
      .gte("logged_at", since48Iso)
      .order("logged_at", { ascending: false })
      .limit(vitalsCap),
    supabase
      .from("health_wearable_samples")
      .select("id, patient_id, metric, value_numeric, unit, observed_start, metadata")
      .in("patient_id", ids)
      .gte("observed_start", since14dIso)
      .order("observed_start", { ascending: false })
      .limit(wearCap),
  ]);

  const heuristicRules = (hrErr ? [] : (heuristicRows ?? [])) as HeuristicRule[];
  if (vBatchErr) {
    return {
      loadError: sanitizeSupabaseError(vBatchErr),
      rows: [],
      pendingLinkRequests: mappedPending,
      triageRules: rules,
      hospitalNames,
      hospitalsMeta,
      realtimeHospitalKey,
      staffProfile,
    };
  }
  if (wBatchErr) {
    return {
      loadError: sanitizeSupabaseError(wBatchErr),
      rows: [],
      pendingLinkRequests: mappedPending,
      triageRules: rules,
      hospitalNames,
      hospitalsMeta,
      realtimeHospitalKey,
      staffProfile,
    };
  }

  const vitalsByPatient = new Map<string, VitalLogRow[]>();
  const groupedV = new Map<string, (VitalLogRow & { patient_id: string })[]>();
  for (const row of (allVitals ?? []) as (VitalLogRow & { patient_id: string })[]) {
    const list = groupedV.get(row.patient_id) ?? [];
    if (list.length < 120) list.push(row);
    groupedV.set(row.patient_id, list);
  }
  for (const [pid, rows] of groupedV) {
    vitalsByPatient.set(
      pid,
      rows.map((row) => {
        const { patient_id: _pid, ...rest } = row;
        void _pid;
        return rest;
      })
    );
  }

  const wearablesByPatient = new Map<string, WearableSampleRow[]>();
  const groupedW = new Map<string, Record<string, unknown>[]>();
  for (const row of allWear ?? []) {
    const pid = (row as { patient_id: string }).patient_id;
    const list = groupedW.get(pid) ?? [];
    if (list.length < 500) list.push(row as Record<string, unknown>);
    groupedW.set(pid, list);
  }
  for (const [pid, rows] of groupedW) {
    wearablesByPatient.set(
      pid,
      rows.map((row) => ({
        ...row,
        metadata:
          typeof row.metadata === "object" && row.metadata !== null && !Array.isArray(row.metadata)
            ? (row.metadata as Record<string, unknown>)
            : {},
      })) as WearableSampleRow[]
    );
  }

  const biomarkersByPatient = new Map<string, BiomarkerModalRow[]>();
  const groupedBio = new Map<string, BiomarkerModalRow[]>();
  for (const row of (bioErr ? [] : allBiomarkers) ?? []) {
    const raw = row as BiomarkerModalRow & { patient_id: string };
    const pid = raw.patient_id;
    const list = groupedBio.get(pid) ?? [];
    if (list.length < 80) {
      const { patient_id: _pid, ...rest } = raw;
      void _pid;
      list.push(rest as BiomarkerModalRow);
    }
    groupedBio.set(pid, list);
  }
  for (const [pid, rows] of groupedBio) {
    biomarkersByPatient.set(pid, rows);
  }

  const rules24h: MergedAlertRules = {
    fever_celsius_min: rules.fever_celsius_min,
    alert_window_hours: 24,
    ctcae_yellow_min_grade: rules.ctcae_yellow_min_grade,
    ctcae_red_min_grade: rules.ctcae_red_min_grade,
  };

  const maxByPatient = new Map<string, number>();
  const lastAtByPatient = new Map<string, string>();
  const urgencyByPatient = new Map<string, number>();
  for (const l of logRows) {
    if (new Date(l.logged_at).getTime() < sinceRiskMs) continue;
    const r = symptomLogTriageRank(l);
    const prev = maxByPatient.get(l.patient_id) ?? 0;
    if (r > prev) maxByPatient.set(l.patient_id, r);
    const cur = lastAtByPatient.get(l.patient_id);
    const la = l.logged_at as string;
    if (!cur || new Date(la) > new Date(cur)) lastAtByPatient.set(l.patient_id, la);
    const sem = l.triage_semaphore;
    const ur = sem === "red" ? 3 : sem === "yellow" ? 2 : sem === "green" ? 1 : 0;
    const prevU = urgencyByPatient.get(l.patient_id) ?? 0;
    if (ur > prevU) urgencyByPatient.set(l.patient_id, ur);
  }

  const enriched: RiskRow[] = plist.map((p) => {
    const n = maxByPatient.get(p.id) ?? 0;
    const { label, cls } = riskFromRank(n, p.is_in_nadir);
    const { hasAlert, reasons } = patientClinicalAlert(logRows, p.id, rules, nowMs);
    const { hasAlert: hasAlert24h } = patientClinicalAlert(logRows, p.id, rules24h, nowMs);
    const u = urgencyByPatient.get(p.id) ?? 0;
    const urgencySemaphore: "red" | "yellow" | "green" | null =
      u === 3 ? "red" : u === 2 ? "yellow" : u === 1 ? "green" : null;
    const pLogs = logRows.filter((l) => l.patient_id === p.id);
    const { score: suspensionRiskScore } = calculateSuspensionRisk(
      p,
      pLogs as unknown as SymptomLogDetail[],
      vitalsByPatient.get(p.id) ?? [],
      wearablesByPatient.get(p.id) ?? [],
      rules.fever_celsius_min,
      biomarkersByPatient.get(p.id) ?? [],
      heuristicRules
    );
    return {
      ...p,
      risk: n,
      riskLabel: label,
      riskClass: cls,
      lastSymptomAt: lastAtByPatient.get(p.id) ?? null,
      hasClinicalAlert: hasAlert,
      alertReasons: reasons,
      hasAlert24h,
      urgencySemaphore,
      suspensionRiskScore,
    };
  });

  enriched.sort(
    (a, b) =>
      (a.hasClinicalAlert === b.hasClinicalAlert ? 0 : a.hasClinicalAlert ? -1 : 1) ||
      b.risk - a.risk ||
      (a.is_in_nadir === b.is_in_nadir ? 0 : a.is_in_nadir ? -1 : 1)
  );

  return {
    loadError: null,
    rows: enriched,
    pendingLinkRequests: mappedPending,
    triageRules: rules,
    hospitalNames,
    hospitalsMeta,
    realtimeHospitalKey,
    staffProfile,
  };
}

export function triageQueryKey(userId: string | undefined) {
  return ["triage", userId ?? ""] as const;
}

export function useTriageQuery(session: Session | null) {
  const userId = session?.user?.id;
  return useQuery({
    queryKey: triageQueryKey(userId),
    queryFn: () => fetchTriageBundle(session!),
    enabled: Boolean(userId && session),
    staleTime: TRIAGE_STALE_MS,
    gcTime: TRIAGE_GC_MS,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible" ? TRIAGE_REFETCH_MS : false,
    refetchOnWindowFocus: false,
  });
}
