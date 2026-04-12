import { useCallback, useEffect, useMemo, useState } from "react";
import { refreshSupabaseSessionIfStale } from "@/lib/authSession";
import { ensureStaffIfPending } from "@/staffLink";
import { supabase } from "@/lib/supabase";

export type InfusionResourceRow = {
  id: string;
  hospital_id: string;
  kind: "chair" | "stretcher";
  label: string;
  sort_order: number;
  operational_status: "active" | "maintenance";
  details: string | null;
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

export function useInfusionAgenda() {
  const [authUserId, setAuthUserId] = useState<string | null | undefined>(undefined);
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [resources, setResources] = useState<InfusionResourceRow[]>([]);
  const [bookings, setBookings] = useState<InfusionBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setAuthUserId(data.session?.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadData = useCallback(async () => {
    const { data: auth } = await supabase.auth.getSession();
    const fresh = await refreshSupabaseSessionIfStale(auth.session);
    if (!fresh?.user) {
      setLoading(false);
      return;
    }
    await ensureStaffIfPending();
    const { data: sa } = await supabase.from("staff_assignments").select("hospital_id").eq("staff_id", fresh.user.id).limit(1).maybeSingle();
    const hid = sa?.hospital_id;
    if (!hid) {
      setError("Sem vínculo hospitalar.");
      setResources([]);
      setBookings([]);
      setLoading(false);
      return;
    }
    setHospitalId(hid);

    const fromIso = new Date(Date.now() - BOOKING_WINDOW_PAST_MS).toISOString();
    const toIso = new Date(Date.now() + BOOKING_WINDOW_FUTURE_MS).toISOString();

    const [resR, bookR] = await Promise.all([
      supabase.from("infusion_resources").select("*").eq("hospital_id", hid).order("sort_order", { ascending: true }),
      supabase
        .from("infusion_resource_bookings")
        .select(
          "id, resource_id, patient_id, starts_at, ends_at, medication_notes, patients ( profiles ( full_name ) )"
        )
        .eq("hospital_id", hid)
        .gte("ends_at", fromIso)
        .lte("starts_at", toIso)
        .order("starts_at", { ascending: true }),
    ]);

    if (resR.error) setError(resR.error.message);
    else if (bookR.error) setError(bookR.error.message);
    else setError(null);

    setResources((resR.data ?? []) as InfusionResourceRow[]);
    setBookings((bookR.data ?? []) as unknown as InfusionBookingRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authUserId === undefined) return;
    if (!authUserId) {
      setHospitalId(null);
      setResources([]);
      setBookings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void loadData();
  }, [authUserId, loadData]);

  useEffect(() => {
    if (!hospitalId || authUserId === undefined || !authUserId) return;

    const chResources = supabase
      .channel(`infusion_resources:${hospitalId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "infusion_resources", filter: `hospital_id=eq.${hospitalId}` },
        () => void loadData()
      )
      .subscribe();

    const chBookings = supabase
      .channel(`infusion_bookings:${hospitalId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "infusion_resource_bookings", filter: `hospital_id=eq.${hospitalId}` },
        () => void loadData()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(chResources);
      void supabase.removeChannel(chBookings);
    };
  }, [hospitalId, authUserId, loadData]);

  const kpis = useMemo(() => {
    const now = Date.now();
    let maintenance = 0;
    let occupied = 0;
    let available = 0;
    for (const r of resources) {
      if (r.operational_status === "maintenance") {
        maintenance += 1;
        continue;
      }
      const occ = bookings.some((b) => {
        if (b.resource_id !== r.id) return false;
        const s = Date.parse(b.starts_at);
        const e = Date.parse(b.ends_at);
        return now >= s && now < e;
      });
      if (occ) occupied += 1;
      else available += 1;
    }
    return { maintenance, occupied, available, total: resources.length };
  }, [resources, bookings]);

  return {
    hospitalId,
    resources,
    bookings,
    loading,
    error,
    reload: loadData,
    kpis,
  };
}
