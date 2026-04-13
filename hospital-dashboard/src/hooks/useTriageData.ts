import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { refreshSupabaseSessionIfStale } from "../lib/authSession";
import { ensureStaffIfPending } from "../staffLink";
import { mergeAlertRulesFromAssignments, patientClinicalAlert, symptomLogTriageRank } from "../lib/triage";
import { riskFromRank } from "../lib/riskUi";
import { supabase } from "../lib/supabase";
import type {
  HospitalEmbed,
  HospitalMetaRow,
  PatientRow,
  RiskRow,
  SymptomLogTriage,
  MergedAlertRules,
} from "../types/dashboard";

type CohortRow = { bucket: string; symptom_count: number; requires_action_count: number };

export function useTriageData(session: Session | null) {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rows, setRows] = useState<RiskRow[]>([]);
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
    const { data: auth } = await supabase.auth.getSession();
    const fresh = await refreshSupabaseSessionIfStale(auth.session);
    if (!fresh?.user) {
      setBusy(false);
      return;
    }
    setLoadError(null);
    setBusy(true);
    const { data: assigns, error: aErr } = await supabase
      .from("staff_assignments")
      .select("hospital_id, hospitals ( name, alert_rules )");
    if (aErr) {
      setLoadError(aErr.message);
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
      setBusy(false);
      return;
    }

    const rules = mergeAlertRulesFromAssignments(assigns as { hospitals?: HospitalEmbed | HospitalEmbed[] | null }[]);
    setTriageRules(rules);

    const metaMap = new Map<string, Omit<HospitalMetaRow, "integration_settings"> & { integration_settings?: Record<string, unknown> }>();
    const names = new Set<string>();
    for (const row of assigns as {
      hospital_id: string;
      hospitals?: { name?: string; alert_rules?: unknown } | { name?: string; alert_rules?: unknown }[] | null;
    }[]) {
      const h = row.hospitals;
      const list = !h ? [] : Array.isArray(h) ? h : [h];
      for (const x of list) {
        if (!x) continue;
        if (x.name) names.add(x.name);
        const ar = x.alert_rules;
        const rulesObj =
          typeof ar === "object" && ar !== null && !Array.isArray(ar) ? { ...(ar as Record<string, unknown>) } : {};
        metaMap.set(row.hospital_id, {
          id: row.hospital_id,
          name: String(x.name ?? "Hospital"),
          alert_rules: rulesObj,
        });
      }
    }
    setHospitalNames([...names]);

    const hospitalIds = [...new Set(assigns.map((a) => a.hospital_id))];
    setRealtimeHospitalKey(hospitalIds.slice().sort().join(","));
    const intByHospital = new Map<string, Record<string, unknown>>();
    const { data: intRows, error: intErr } = await supabase.from("hospitals").select("id, integration_settings").in("id", hospitalIds);
    if (!intErr && intRows) {
      for (const row of intRows as { id: string; integration_settings: unknown }[]) {
        const ir = row.integration_settings;
        intByHospital.set(
          row.id,
          typeof ir === "object" && ir !== null && !Array.isArray(ir) ? { ...(ir as Record<string, unknown>) } : {}
        );
      }
    }

    const mergedMeta: HospitalMetaRow[] = [...metaMap.values()].map((m) => ({
      ...m,
      integration_settings: intByHospital.get(m.id) ?? {},
    }));
    setHospitalsMeta(mergedMeta);

    const { data: approvedLinks, error: linkErr } = await supabase
      .from("patient_hospital_links")
      .select("patient_id")
      .in("hospital_id", hospitalIds)
      .eq("status", "approved");
    if (linkErr) {
      setLoadError(linkErr.message);
      setBusy(false);
      return;
    }
    const linkedPatientIds = [...new Set((approvedLinks ?? []).map((r) => r.patient_id))];

    const { data: legacyPatients, error: lpErr } = await supabase
      .from("patients")
      .select("id, primary_cancer_type, current_stage, is_in_nadir, patient_code, profiles ( full_name, date_of_birth, avatar_url )")
      .in("hospital_id", hospitalIds);
    if (lpErr) {
      setLoadError(lpErr.message);
      setBusy(false);
      return;
    }
    const legacyList = (legacyPatients ?? []) as unknown as PatientRow[];
    const legacyIdSet = new Set(legacyList.map((p) => p.id));
    const onlyViaLink = linkedPatientIds.filter((id) => !legacyIdSet.has(id));

    let linkOnlyPatients: PatientRow[] = [];
    if (onlyViaLink.length > 0) {
      const { data: extra, error: exErr } = await supabase
        .from("patients")
        .select("id, primary_cancer_type, current_stage, is_in_nadir, patient_code, profiles ( full_name, date_of_birth, avatar_url )")
        .in("id", onlyViaLink);
      if (exErr) {
        setLoadError(exErr.message);
        setBusy(false);
        return;
      }
      linkOnlyPatients = (extra ?? []) as unknown as PatientRow[];
    }

    const merged = new Map<string, PatientRow>();
    for (const p of legacyList) merged.set(p.id, p);
    for (const p of linkOnlyPatients) merged.set(p.id, p);
    const plist = [...merged.values()];
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
        "patient_id, severity, logged_at, symptom_category, body_temperature, entry_kind, pain_level, nausea_level, fatigue_level"
      )
      .in("patient_id", ids)
      .gte("logged_at", sinceFetch.toISOString());

    if (lErr) {
      setLoadError(lErr.message);
      setBusy(false);
      return;
    }

    const logRows = (logs ?? []) as SymptomLogTriage[];

    const rules24h: MergedAlertRules = {
      fever_celsius_min: rules.fever_celsius_min,
      alert_window_hours: 24,
    };

    const maxByPatient = new Map<string, number>();
    const lastAtByPatient = new Map<string, string>();
    for (const l of logRows) {
      if (new Date(l.logged_at).getTime() < sinceRiskMs) continue;
      const r = symptomLogTriageRank(l);
      const prev = maxByPatient.get(l.patient_id) ?? 0;
      if (r > prev) maxByPatient.set(l.patient_id, r);
      const cur = lastAtByPatient.get(l.patient_id);
      const la = l.logged_at as string;
      if (!cur || new Date(la) > new Date(cur)) lastAtByPatient.set(l.patient_id, la);
    }

    const enriched: RiskRow[] = plist.map((p) => {
      const n = maxByPatient.get(p.id) ?? 0;
      const { label, cls } = riskFromRank(n, p.is_in_nadir);
      const { hasAlert, reasons } = patientClinicalAlert(logRows, p.id, rules, nowMs);
      const { hasAlert: hasAlert24h } = patientClinicalAlert(logRows, p.id, rules24h, nowMs);
      return {
        ...p,
        risk: n,
        riskLabel: label,
        riskClass: cls,
        lastSymptomAt: lastAtByPatient.get(p.id) ?? null,
        hasClinicalAlert: hasAlert,
        alertReasons: reasons,
        hasAlert24h,
      };
    });

    enriched.sort(
      (a, b) =>
        (a.hasClinicalAlert === b.hasClinicalAlert ? 0 : a.hasClinicalAlert ? -1 : 1) ||
        b.risk - a.risk ||
        (a.is_in_nadir === b.is_in_nadir ? 0 : a.is_in_nadir ? -1 : 1)
    );

    setRows(enriched);
    setBusy(false);
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
    const filter =
      parts.length === 1 ? `hospital_id=eq.${parts[0]}` : `hospital_id=in.(${parts.join(",")})`;
    const channel = supabase
      .channel(`symptom_logs_triage:${realtimeHospitalKey}`)
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
    if (!session?.user) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel("triage_profiles_avatar")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        () => {
          if (t) clearTimeout(t);
          t = setTimeout(() => {
            t = null;
            scheduleTriageReload();
          }, 1000);
        }
      )
      .subscribe();
    return () => {
      if (t) clearTimeout(t);
      void supabase.removeChannel(channel);
    };
  }, [session?.user, scheduleTriageReload]);

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
        setCohortError(error.message);
        setCohortRows([]);
        return;
      }
      setCohortRows((data ?? []) as CohortRow[]);
    })();
  }, [session?.user, cohortHospitalId]);

  const kpiStats = useMemo(
    () => ({
      total: rows.length,
      alerts24h: rows.filter((r) => r.hasAlert24h).length,
      criticalHigh: rows.filter((r) => r.risk >= 3).length,
      nadir: rows.filter((r) => r.is_in_nadir).length,
    }),
    [rows]
  );

  return {
    loadError,
    rows,
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
