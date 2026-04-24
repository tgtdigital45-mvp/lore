import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { sanitizeSupabaseError } from "../lib/errorMessages";
import { ensureStaffIfPending } from "../staffLink";
import { supabase } from "../lib/supabase";
import type { HospitalMetaRow, MergedAlertRules, PendingStaffLinkRequest, RiskRow } from "../types/dashboard";
import { triageQueryKey, useTriageQuery } from "./useTriageQuery";

type CohortRow = { bucket: string; symptom_count: number; requires_action_count: number };

export function useTriageData(session: Session | null) {
  const queryClient = useQueryClient();
  const triageQuery = useTriageQuery(session);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [rows, setRows] = useState<RiskRow[]>([]);
  const [pendingLinkRequests, setPendingLinkRequests] = useState<PendingStaffLinkRequest[]>([]);
  const [triageRules, setTriageRules] = useState<MergedAlertRules>({
    fever_celsius_min: 37.8,
    alert_window_hours: 72,
  });
  const [staffProfile, setStaffProfile] = useState<{
    full_name: string;
    role: string;
    avatar_url: string | null;
    professional_license: string | null;
    specialty: string | null;
  } | null>(null);
  const [staffAvatarBust, setStaffAvatarBust] = useState(0);
  const [hospitalNames, setHospitalNames] = useState<string[]>([]);
  const [hospitalsMeta, setHospitalsMeta] = useState<HospitalMetaRow[]>([]);
  const [realtimeHospitalKey, setRealtimeHospitalKey] = useState("");
  const [cohortHospitalId, setCohortHospitalId] = useState<string | null>(null);
  const [cohortRows, setCohortRows] = useState<CohortRow[]>([]);
  const [cohortLoading, setCohortLoading] = useState(false);
  const [cohortError, setCohortError] = useState<string | null>(null);

  const triageReloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const d = triageQuery.data;
    if (!d) {
      if (!session?.user?.id) {
        setRows([]);
        setPendingLinkRequests([]);
        setHospitalNames([]);
        setHospitalsMeta([]);
        setRealtimeHospitalKey("");
        setLoadError(null);
        setStaffProfile(null);
      }
      return;
    }
    setRows(d.rows);
    setPendingLinkRequests(d.pendingLinkRequests);
    setTriageRules(d.triageRules);
    setLoadError(d.loadError);
    setHospitalNames(d.hospitalNames);
    setHospitalsMeta(d.hospitalsMeta);
    setRealtimeHospitalKey(d.realtimeHospitalKey);
    if (d.staffProfile) {
      setStaffProfile(d.staffProfile);
    }
  }, [triageQuery.data, session?.user?.id]);

  const busy = Boolean(
    (triageQuery.isPending || (triageQuery.isFetching && rows.length === 0)) && !triageQuery.data
  );

  const reloadStaffProfile = useCallback(async () => {
    const uid = session?.user?.id;
    if (!uid) {
      setStaffProfile(null);
      return;
    }
    await ensureStaffIfPending();
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, role, avatar_url, professional_license, specialty")
      .eq("id", uid)
      .single();
    if (!error && data) {
      setStaffProfile({
        full_name: data.full_name ?? "",
        role: data.role ?? "",
        avatar_url: typeof data.avatar_url === "string" ? data.avatar_url : null,
        professional_license: typeof data.professional_license === "string" ? data.professional_license : null,
        specialty: typeof data.specialty === "string" ? data.specialty : null,
      });
      setStaffAvatarBust((n) => n + 1);
    }
  }, [session?.user?.id]);

  const loadTriage = useCallback(() => {
    void triageQuery.refetch();
  }, [triageQuery]);

  const scheduleTriageReload = useCallback(() => {
    if (triageReloadTimer.current) clearTimeout(triageReloadTimer.current);
    triageReloadTimer.current = setTimeout(() => {
      triageReloadTimer.current = null;
      const uid = session?.user?.id;
      void queryClient.invalidateQueries({ queryKey: triageQueryKey(uid) });
    }, 800);
  }, [queryClient, session?.user?.id]);

  useEffect(() => {
    return () => {
      if (triageReloadTimer.current) clearTimeout(triageReloadTimer.current);
    };
  }, []);

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
          const raw = payload.new as Record<string, unknown> | null | undefined;
          if (!raw || typeof raw.id !== "string") return;
          const profileId = raw.id;
          const patch: Record<string, unknown> = raw;
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
                typeof patch.full_name === "string" ? patch.full_name : (prof.full_name ?? ""),
              date_of_birth:
                patch.date_of_birth !== undefined
                  ? (patch.date_of_birth as string | null)
                  : prof.date_of_birth,
              avatar_url:
                patch.avatar_url !== undefined ? (patch.avatar_url as string | null) : prof.avatar_url,
              phone_e164:
                patch.phone_e164 !== undefined ? (patch.phone_e164 as string | null) : prof.phone_e164,
              email_display:
                patch.email_display !== undefined ? (patch.email_display as string | null) : prof.email_display,
              whatsapp_opt_in_at:
                patch.whatsapp_opt_in_at !== undefined
                  ? (patch.whatsapp_opt_in_at as string | null)
                  : (prof as { whatsapp_opt_in_at?: string | null }).whatsapp_opt_in_at,
              whatsapp_opt_in_revoked_at:
                patch.whatsapp_opt_in_revoked_at !== undefined
                  ? (patch.whatsapp_opt_in_revoked_at as string | null)
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
    triageQuery,
    loadError: loadError ?? (triageQuery.error instanceof Error ? triageQuery.error.message : null),
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
