import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { refreshSupabaseSessionIfStale } from "../lib/authSession";
import { sanitizeSupabaseError } from "../lib/errorMessages";
import { ensureStaffIfPending } from "../staffLink";
import { mergeAlertRulesFromAssignments, patientClinicalAlert, symptomLogTriageRank } from "../lib/triage";
import { riskFromRank } from "../lib/riskUi";
import { calculateSuspensionRisk } from "../lib/suspensionRisk";
import { supabase } from "../lib/supabase";
import type {
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

type CohortRow = { bucket: string; symptom_count: number; requires_action_count: number };

export function useTriageData(session: Session | null) {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rows, setRows] = useState<RiskRow[]>([]);
  const [pendingLinkRequests, setPendingLinkRequests] = useState<PendingStaffLinkRequest[]>([]);
  const [triageRules, setTriageRules] = useState<MergedAlertRules>({ fever_celsius_min: 37.8, alert_window_hours: 72 });
  const [busy, setBusy] = useState(false);
  const [staffProfile, setStaffProfile] = useState<{ full_name: string; role: string; avatar_url: string | null } | null>(null);
  /** Bumps when staff profile is reloaded so repeated public avatar URLs still refresh in the browser. */
  const [staffAvatarBust, setStaffAvatarBust] = useState(0);
  const [hospitalNames, setHospitalNames] = useState<string[]>([]);
  const [hospitalsMeta, setHospitalsMeta] = useState<HospitalMetaRow[]>([]);
  const [realtimeHospitalKey, setRealtimeHospitalKey] = useState("");
  const [cohortHospitalId, setCohortHospitalId] = useState<string | null>(null);
  const [cohortRows, setCohortRows] = useState<CohortRow[]>([]);
  const [cohortLoading, setCohortLoading] = useState(false);
  const [cohortError, setCohortError] = useState<string | null>(null);

  const triageReloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadVersion = useRef(0);
  /** Evita `setBusy(true)` em refreshes em background (mantém dossié montado e lista estável). */
  const rowsRef = useRef<RiskRow[]>([]);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const reloadStaffProfile = useCallback(async () => {
    const uid = session?.user?.id;
    if (!uid) {
      setStaffProfile(null);
      return;
    }
    await ensureStaffIfPending();
    const { data, error } = await supabase.from("profiles").select("full_name, role, avatar_url").eq("id", uid).single();
    if (!error && data) {
      setStaffProfile({
        full_name: data.full_name ?? "",
        role: data.role ?? "",
        avatar_url: typeof data.avatar_url === "string" ? data.avatar_url : null,
      });
      setStaffAvatarBust((n) => n + 1);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) {
      setStaffProfile(null);
      return;
    }
    void reloadStaffProfile();
  }, [session, reloadStaffProfile]);

  const loadTriage = useCallback(async () => {
    const version = ++loadVersion.current;
    try {
      const { data: auth } = await supabase.auth.getSession();
      const fresh = await refreshSupabaseSessionIfStale(auth.session);
      if (!fresh?.user) {
        if (version === loadVersion.current) setBusy(false);
        return;
      }
      if (version !== loadVersion.current) return;
      setLoadError(null);
      if (rowsRef.current.length === 0) {
        setBusy(true);
      }
    const { data: assigns, error: aErr } = await supabase
      .from("staff_assignments")
      .select(
        "hospital_id, hospitals ( name, alert_rules, logo_url, brand_color_hex, display_name, triage_config )"
      );
    if (version !== loadVersion.current) return;
    if (aErr) {
      setLoadError(sanitizeSupabaseError(aErr));
      setHospitalNames([]);
      setHospitalsMeta([]);
      setRealtimeHospitalKey("");
      setBusy(false);
      return;
    }
    if (!assigns?.length) {
      setLoadError("Nenhuma lotação hospitalar para este usuário. Peça inclusão em staff_assignments.");
      setHospitalNames([]);
      setHospitalsMeta([]);
      setRealtimeHospitalKey("");
      setPendingLinkRequests([]);
      setBusy(false);
      return;
    }

    const rules = mergeAlertRulesFromAssignments(assigns as { hospitals?: HospitalEmbed | HospitalEmbed[] | null }[]);
    setTriageRules(rules);

    const metaMap = new Map<string, Omit<HospitalMetaRow, "integration_settings"> & { integration_settings?: Record<string, unknown> }>();
    const names = new Set<string>();
    for (const row of assigns as {
      hospital_id: string;
      hospitals?:
        | {
            name?: string;
            alert_rules?: unknown;
            logo_url?: string | null;
            brand_color_hex?: string | null;
            display_name?: string | null;
            triage_config?: unknown;
          }
        | {
            name?: string;
            alert_rules?: unknown;
            logo_url?: string | null;
            brand_color_hex?: string | null;
            display_name?: string | null;
            triage_config?: unknown;
          }[]
        | null;
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
        metaMap.set(row.hospital_id, {
          id: row.hospital_id,
          name: String(x.name ?? "Hospital"),
          alert_rules: rulesObj,
          logo_url: x.logo_url ?? null,
          brand_color_hex: x.brand_color_hex ?? null,
          display_name: x.display_name ?? null,
          triage_config: triageCfg,
        });
      }
    }
    setHospitalNames([...names]);

    const hospitalIds = [...new Set(assigns.map((a) => a.hospital_id))];
    setRealtimeHospitalKey(hospitalIds.slice().sort().join(","));
    const intByHospital = new Map<string, Record<string, unknown>>();
    const { data: intRows, error: intErr } = await supabase
      .from("hospitals")
      .select(
        "id, integration_settings, alert_webhook_url, fhir_export_enabled"
      )
      .in("id", hospitalIds);
    if (!intErr && intRows) {
      for (const row of intRows as {
        id: string;
        integration_settings: unknown;
        alert_webhook_url?: string | null;
        fhir_export_enabled?: boolean | null;
      }[]) {
        const ir = row.integration_settings;
        intByHospital.set(
          row.id,
          typeof ir === "object" && ir !== null && !Array.isArray(ir) ? { ...(ir as Record<string, unknown>) } : {}
        );
      }
    }

    const webhookByHospital = new Map<string, { url: string | null; fhir: boolean }>();
    if (!intErr && intRows) {
      for (const row of intRows as {
        id: string;
        alert_webhook_url?: string | null;
        fhir_export_enabled?: boolean | null;
      }[]) {
        webhookByHospital.set(row.id, {
          url: row.alert_webhook_url ?? null,
          fhir: Boolean(row.fhir_export_enabled),
        });
      }
    }

    const mergedMeta: HospitalMetaRow[] = [...metaMap.values()].map((m) => {
      const wh = webhookByHospital.get(m.id);
      return {
        ...m,
        integration_settings: intByHospital.get(m.id) ?? {},
        alert_webhook_url: wh?.url ?? null,
        fhir_export_enabled: wh?.fhir ?? false,
      };
    });
    setHospitalsMeta(mergedMeta);

    /** Pedidos enviados pelo staff, a aguardar aprovação no app Aura (não entram em `rows` até `approved`). */
    const { data: pendingRaw, error: pendErr } = await supabase
      .from("patient_hospital_links")
      .select(
        `id, patient_id, hospital_id, requested_at,
        patients ( patient_code, profiles!patients_profile_id_fkey ( full_name ) )`
      )
      .in("hospital_id", hospitalIds)
      .eq("status", "pending")
      .not("requested_by", "is", null)
      .order("requested_at", { ascending: false });
    if (version !== loadVersion.current) return;
    if (pendErr) {
      setLoadError(sanitizeSupabaseError(pendErr));
      setBusy(false);
      return;
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
    if (version === loadVersion.current) setPendingLinkRequests(mappedPending);

    /** Só vínculos pedidos por um profissional (fluxo «Adicionar por código»). Quem vem só de `patients.hospital_id` + trigger/backfill tem `requested_by` NULL e não entra na lista. */
    const { data: approvedLinks, error: linkErr } = await supabase
      .from("patient_hospital_links")
      .select("patient_id")
      .in("hospital_id", hospitalIds)
      .eq("status", "approved")
      .not("requested_by", "is", null);
    if (linkErr) {
      setLoadError(sanitizeSupabaseError(linkErr));
      setBusy(false);
      return;
    }
    const linkedPatientIds = [...new Set((approvedLinks ?? []).map((r) => r.patient_id))];

    if (linkedPatientIds.length === 0) {
      setRows([]);
      setBusy(false);
      return;
    }

    const { data: linkedPatients, error: lpErr } = await supabase
      .from("patients")
      .select(
        "id, profile_id, primary_cancer_type, current_stage, is_in_nadir, patient_code, profiles!patients_profile_id_fkey ( full_name, date_of_birth, avatar_url, phone_e164, whatsapp_opt_in_at, whatsapp_opt_in_revoked_at )"
      )
      .in("id", linkedPatientIds);
    if (lpErr) {
      setLoadError(sanitizeSupabaseError(lpErr));
      setBusy(false);
      return;
    }

    const plist = ((linkedPatients ?? []) as unknown as PatientRow[]).filter(
      (p) => (p.patient_code?.trim()?.length ?? 0) > 0
    );
    if (plist.length === 0) {
      setRows([]);
      setBusy(false);
      return;
    }

    const nowMs = Date.now();
    const fetchHours = Math.max(168, rules.alert_window_hours);
    const sinceFetch = new Date(nowMs - fetchHours * 3600 * 1000);
    const sinceRiskMs = nowMs - 168 * 3600 * 1000;

    const ids = plist.map((p) => p.id);
    const { data: logs, error: lErr } = await supabase
      .from("symptom_logs")
      .select(
        "patient_id, severity, logged_at, symptom_category, body_temperature, entry_kind, pain_level, nausea_level, fatigue_level, ae_max_grade, triage_semaphore"
      )
      .in("patient_id", ids)
      .gte("logged_at", sinceFetch.toISOString());

    if (lErr) {
      setLoadError(sanitizeSupabaseError(lErr));
      setBusy(false);
      return;
    }

    const logRows = (logs ?? []) as SymptomLogTriage[];

    /**
     * Vitals/wearables para `calculateSuspensionRisk` devem ser por paciente (como no dossiê).
     * Uma única query com `.order().limit(N)` global prioriza poucos pacientes e zera vitals dos outros → score de suspensão falso.
     */
    const since48Iso = new Date(nowMs - 48 * 3600 * 1000).toISOString();
    const since14dIso = new Date(nowMs - 14 * 86400000).toISOString();
    const vitalsCap = Math.min(120 * ids.length, 8000);
    const wearCap = Math.min(500 * ids.length, 20000);

    const [{ data: allVitals, error: vBatchErr }, { data: allWear, error: wBatchErr }] = await Promise.all([
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
    if (version !== loadVersion.current) return;
    if (vBatchErr) {
      setLoadError(sanitizeSupabaseError(vBatchErr));
      setBusy(false);
      return;
    }
    if (wBatchErr) {
      setLoadError(sanitizeSupabaseError(wBatchErr));
      setBusy(false);
      return;
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
        rules.fever_celsius_min
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

    if (version === loadVersion.current) setRows(enriched);
    } catch (err) {
      if (version === loadVersion.current) {
        setLoadError(err instanceof Error ? sanitizeSupabaseError(err) : "Erro ao carregar triagem.");
      }
    } finally {
      if (version === loadVersion.current) setBusy(false);
    }
  }, []);

  const scheduleTriageReload = useCallback(() => {
    if (triageReloadTimer.current) clearTimeout(triageReloadTimer.current);
    triageReloadTimer.current = setTimeout(() => {
      triageReloadTimer.current = null;
      void loadTriage();
    }, 800);
  }, [loadTriage]);

  useEffect(() => {
    return () => {
      if (triageReloadTimer.current) clearTimeout(triageReloadTimer.current);
    };
  }, []);

  useEffect(() => {
    if (session) void loadTriage();
  }, [session, loadTriage]);

  useEffect(() => {
    if (!session?.user || !realtimeHospitalKey) return;
    const parts = realtimeHospitalKey.split(",").filter(Boolean);
    if (parts.length === 0) return;
    const scope = crypto.randomUUID();
    const filter =
      parts.length === 1 ? `hospital_id=eq.${parts[0]}` : `hospital_id=in.(${parts.join(",")})`;
    const channel = supabase
      .channel(`symptom_logs_triage:${realtimeHospitalKey}:${scope}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "symptom_logs", filter },
        () => scheduleTriageReload()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "symptom_logs", filter },
        () => scheduleTriageReload()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session?.user, realtimeHospitalKey, scheduleTriageReload]);

  useEffect(() => {
    if (!session?.user || !realtimeHospitalKey) return;
    const parts = realtimeHospitalKey.split(",").filter(Boolean);
    if (parts.length === 0) return;
    const scope = crypto.randomUUID();
    const filter =
      parts.length === 1 ? `hospital_id=eq.${parts[0]}` : `hospital_id=in.(${parts.join(",")})`;
    const channel = supabase
      .channel(`patient_hospital_links_triage:${realtimeHospitalKey}:${scope}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patient_hospital_links", filter },
        () => scheduleTriageReload()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session?.user, realtimeHospitalKey, scheduleTriageReload]);

  useEffect(() => {
    if (!session?.user) return;
    const staffId = session.user.id;
    const scope = crypto.randomUUID();
    const channel = supabase
      .channel(`triage_profiles_patch:${scope}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const newRow = payload.new as Record<string, unknown> | null | undefined;
          if (!newRow || typeof newRow.id !== "string") return;
          const profileId = newRow.id;
          if (profileId === staffId) {
            void reloadStaffProfile();
            return;
          }
          setRows((prev) => {
            const idx = prev.findIndex((r) => r.profile_id === profileId);
            if (idx < 0) return prev;
            const row = prev[idx];
            const prof = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
            if (!prof) return prev;
            const mergedProf = {
              ...prof,
              full_name:
                typeof newRow.full_name === "string" ? newRow.full_name : (prof.full_name ?? ""),
              date_of_birth:
                newRow.date_of_birth !== undefined
                  ? (newRow.date_of_birth as string | null)
                  : prof.date_of_birth,
              avatar_url:
                newRow.avatar_url !== undefined ? (newRow.avatar_url as string | null) : prof.avatar_url,
              phone_e164:
                newRow.phone_e164 !== undefined ? (newRow.phone_e164 as string | null) : prof.phone_e164,
              email_display:
                newRow.email_display !== undefined ? (newRow.email_display as string | null) : prof.email_display,
              whatsapp_opt_in_at:
                newRow.whatsapp_opt_in_at !== undefined
                  ? (newRow.whatsapp_opt_in_at as string | null)
                  : (prof as { whatsapp_opt_in_at?: string | null }).whatsapp_opt_in_at,
              whatsapp_opt_in_revoked_at:
                newRow.whatsapp_opt_in_revoked_at !== undefined
                  ? (newRow.whatsapp_opt_in_revoked_at as string | null)
                  : (prof as { whatsapp_opt_in_revoked_at?: string | null }).whatsapp_opt_in_revoked_at,
            };
            const next = [...prev];
            next[idx] = { ...row, profiles: mergedProf };
            return next;
          });
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session?.user, reloadStaffProfile]);

  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadTriage();
    }, 45_000);
    return () => window.clearInterval(id);
  }, [session, loadTriage]);

  useEffect(() => {
    if (hospitalsMeta.length > 0 && !cohortHospitalId) setCohortHospitalId(hospitalsMeta[0].id);
  }, [hospitalsMeta, cohortHospitalId]);

  useEffect(() => {
    if (!session?.user || !cohortHospitalId) {
      setCohortRows([]);
      return;
    }
    setCohortLoading(true);
    setCohortError(null);
    void (async () => {
      const { data, error } = await supabase.rpc("staff_symptom_cohort_metrics", {
        p_hospital_id: cohortHospitalId,
        p_days: 14,
      });
      setCohortLoading(false);
      if (error) {
        setCohortError(sanitizeSupabaseError(error));
        setCohortRows([]);
        return;
      }
      setCohortRows((data ?? []) as CohortRow[]);
    })();
  }, [session?.user, cohortHospitalId]);

  const kpiStats = useMemo(
    () => ({
      total: rows.length,
      pendingLinks: pendingLinkRequests.length,
      alerts24h: rows.filter((r) => r.hasAlert24h).length,
      criticalHigh: rows.filter((r) => r.risk >= 3).length,
      nadir: rows.filter((r) => r.is_in_nadir).length,
    }),
    [rows, pendingLinkRequests]
  );

  return {
    loadError,
    rows,
    pendingLinkRequests,
    triageRules,
    busy,
    loadTriage,
    staffProfile,
    staffAvatarBust,
    reloadStaffProfile,
    hospitalNames,
    hospitalsMeta,
    cohortHospitalId,
    setCohortHospitalId,
    cohortRows,
    cohortLoading,
    cohortError,
    kpiStats,
  };
}
