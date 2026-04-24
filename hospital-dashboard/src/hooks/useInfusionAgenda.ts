import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { refreshSupabaseSessionIfStale } from "@/lib/authSession";
import { ensureStaffIfPending } from "@/staffLink";
import { supabase } from "@/lib/supabase";
import { sanitizeSupabaseError } from "@/lib/errorMessages";

export type InfusionResourceRow = {
  id: string;
  hospital_id: string;
  kind: "chair" | "stretcher";
  label: string;
  sort_order: number;
  operational_status: "active" | "maintenance";
  details: string | null;
  /** Touca inglesa PAXMAN / crioterapia de couro cabeludo nesta posição (cadeira ou maca). */
  paxman_cryotherapy: boolean;
};

export type InfusionBookingRow = {
  id: string;
  resource_id: string;
  patient_id: string | null;
  starts_at: string;
  ends_at: string;
  medication_notes: string | null;
  /** Forma variável devolvida pelo PostgREST em joins */
  patients:
    | { profiles: { full_name: string | null } | { full_name: string | null }[] | null }
    | { profiles: { full_name: string | null } | { full_name: string | null }[] | null }[]
    | null;
};

const BOOKING_WINDOW_PAST_MS = 7 * 24 * 60 * 60 * 1000;
const BOOKING_WINDOW_FUTURE_MS = 45 * 24 * 60 * 60 * 1000;

export type UseInfusionAgendaOptions = {
  /** Refresco extra além do tempo real (útil em ecrãs transmitidos). */
  pollIntervalMs?: number;
};

async function fetchInfusionAgendaBundle(hospitalId: string): Promise<{
  resources: InfusionResourceRow[];
  bookings: InfusionBookingRow[];
}> {
  const fromIso = new Date(Date.now() - BOOKING_WINDOW_PAST_MS).toISOString();
  const toIso = new Date(Date.now() + BOOKING_WINDOW_FUTURE_MS).toISOString();

  const [resR, bookR] = await Promise.all([
    supabase.from("infusion_resources").select("*").eq("hospital_id", hospitalId).order("sort_order", { ascending: true }),
    supabase
      .from("infusion_resource_bookings")
      .select(
        "id, resource_id, patient_id, starts_at, ends_at, medication_notes, patients ( profiles!patients_profile_id_fkey ( full_name ) )"
      )
      .eq("hospital_id", hospitalId)
      .gte("ends_at", fromIso)
      .lte("starts_at", toIso)
      .order("starts_at", { ascending: true }),
  ]);

  if (resR.error) throw new Error(sanitizeSupabaseError(resR.error));
  if (bookR.error) throw new Error(sanitizeSupabaseError(bookR.error));

  const resources = (resR.data ?? []).map((r) => ({
    ...(r as InfusionResourceRow),
    paxman_cryotherapy: Boolean((r as { paxman_cryotherapy?: boolean }).paxman_cryotherapy),
  }));
  const bookings = (bookR.data ?? []) as unknown as InfusionBookingRow[];
  return { resources, bookings };
}

export function useInfusionAgenda(options?: UseInfusionAgendaOptions) {
  const queryClient = useQueryClient();
  const [authUserId, setAuthUserId] = useState<string | null | undefined>(undefined);
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [dataUpdatedAt, setDataUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        setAuthUserId(data.session?.user?.id ?? null);
      })
      .catch(() => {
        setAuthUserId(null);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authUserId === undefined) return;
    if (!authUserId) {
      setHospitalId(null);
      setLinkError(null);
      setBootstrapping(false);
      return;
    }

    let cancelled = false;
    setBootstrapping(true);
    void (async () => {
      try {
        const { data: auth } = await supabase.auth.getSession();
        const fresh = await refreshSupabaseSessionIfStale(auth.session);
        if (!fresh?.user) {
          if (!cancelled) {
            setHospitalId(null);
            setLinkError(null);
            setBootstrapping(false);
          }
          return;
        }
        await ensureStaffIfPending();
        const { data: sa } = await supabase.from("staff_assignments").select("hospital_id").eq("staff_id", fresh.user.id).limit(1).maybeSingle();
        const hid = sa?.hospital_id ?? null;
        if (cancelled) return;
        if (!hid) {
          setLinkError("Sem vínculo hospitalar.");
          setHospitalId(null);
        } else {
          setLinkError(null);
          setHospitalId(hid);
        }
      } catch (err) {
        if (!cancelled) {
          setLinkError(err instanceof Error ? sanitizeSupabaseError(err) : "Erro ao resolver hospital.");
          setHospitalId(null);
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  const infusionQuery = useQuery({
    queryKey: ["infusion-agenda", hospitalId],
    queryFn: () => fetchInfusionAgendaBundle(hospitalId!),
    enabled: Boolean(authUserId && hospitalId),
  });

  useEffect(() => {
    if (infusionQuery.isSuccess && infusionQuery.data) {
      setDataUpdatedAt(Date.now());
    }
  }, [infusionQuery.isSuccess, infusionQuery.data, infusionQuery.dataUpdatedAt]);

  const invalidateAgenda = useCallback(() => {
    if (!hospitalId) return;
    void queryClient.invalidateQueries({ queryKey: ["infusion-agenda", hospitalId] });
  }, [hospitalId, queryClient]);

  useEffect(() => {
    if (!hospitalId || authUserId === undefined || !authUserId) return;

    const scope = crypto.randomUUID();

    const chResources = supabase
      .channel(`infusion_resources:${hospitalId}:${scope}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "infusion_resources", filter: `hospital_id=eq.${hospitalId}` },
        invalidateAgenda
      )
      .subscribe();

    const chBookings = supabase
      .channel(`infusion_bookings:${hospitalId}:${scope}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "infusion_resource_bookings", filter: `hospital_id=eq.${hospitalId}` },
        invalidateAgenda
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(chResources);
      void supabase.removeChannel(chBookings);
    };
  }, [hospitalId, authUserId, invalidateAgenda]);

  useEffect(() => {
    const ms = options?.pollIntervalMs;
    if (!ms || ms < 5000 || !authUserId || !hospitalId) return;
    const id = window.setInterval(invalidateAgenda, ms);
    return () => window.clearInterval(id);
  }, [options?.pollIntervalMs, authUserId, hospitalId, invalidateAgenda]);

  const bundle = infusionQuery.data;
  const resources = bundle?.resources ?? [];
  const bookings = bundle?.bookings ?? [];

  const loading =
    authUserId === undefined || bootstrapping || (Boolean(hospitalId) && infusionQuery.isPending);

  const error =
    linkError ??
    (infusionQuery.error instanceof Error
      ? sanitizeSupabaseError(infusionQuery.error)
      : infusionQuery.error
        ? String(infusionQuery.error)
        : null);

  const reload = useCallback(() => {
    if (!hospitalId) return Promise.resolve();
    return queryClient.invalidateQueries({ queryKey: ["infusion-agenda", hospitalId] });
  }, [hospitalId, queryClient]);

  const kpis = useMemo(() => {
    const res = bundle?.resources ?? [];
    const book = bundle?.bookings ?? [];
    const now = Date.now();
    let maintenance = 0;
    let occupied = 0;
    let available = 0;
    for (const r of res) {
      if (r.operational_status === "maintenance") {
        maintenance += 1;
        continue;
      }
      const occ = book.some((b) => {
        if (b.resource_id !== r.id) return false;
        const s = Date.parse(b.starts_at);
        const e = Date.parse(b.ends_at);
        return now >= s && now < e;
      });
      if (occ) occupied += 1;
      else available += 1;
    }
    return { maintenance, occupied, available, total: res.length };
  }, [bundle]);

  return {
    hospitalId,
    resources,
    bookings,
    loading,
    error,
    reload,
    kpis,
    dataUpdatedAt,
  };
}
