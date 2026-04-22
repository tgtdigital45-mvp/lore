import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Beaker,
  Briefcase,
  CalendarClock,
  ClipboardList,
  Flame,
  HeartPulse,
  LayoutDashboard,
  Mail,
  Phone,
  RefreshCw,
  Stethoscope,
  Syringe,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useOncoCare } from "@/context/OncoCareContext";
import { PendingStaffLinksPanel } from "@/components/oncocare/PendingStaffLinksPanel";
import { NadirAlertBanner } from "@/components/oncocare/NadirAlertBanner";
import { PatientFaceThumb } from "@/components/oncocare/PatientFaceThumb";
import { clinicalTier } from "@/lib/clinicalTier";
import { firstName, initialsFromName, profileName, roleLabel } from "@/lib/dashboardProfile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { RiskRow } from "@/types/dashboard";

type StaffExtra = {
  job_title: string | null;
  phone_e164: string | null;
  email_display: string | null;
};

type TodayAppointmentRow = {
  id: string;
  starts_at: string;
  title: string;
  kind: string;
  notes: string | null;
};

type LabReviewRow = {
  id: string;
  label: string;
  patientName: string;
};

type ChartPoint = { name: string; adm: number; alta: number; iso: string };

const LAB_FALLBACK: LabReviewRow[] = [
  { id: "fb1", label: "Hemograma completo", patientName: "(exemplo — sem dados)" },
  { id: "fb2", label: "Função hepática", patientName: "(exemplo — sem dados)" },
  { id: "fb3", label: "Marcadores tumorais", patientName: "(exemplo — sem dados)" },
];

function weekAgoDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

function startEndOfToday(): { start: string; end: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function last7DayKeys(): string[] {
  const keys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function shortWeekdayPt(isoDate: string): string {
  try {
    const d = new Date(`${isoDate}T12:00:00`);
    return d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  } catch {
    return isoDate.slice(5);
  }
}

function appointmentBadge(title: string, kind: string): { label: string; className: string; dot: string } {
  const t = title.toLowerCase();
  if (t.includes("conselho") || t.includes("reuni")) {
    return { label: "REUNIÃO", className: "bg-slate-900 text-white", dot: "bg-slate-600" };
  }
  if (kind === "exam") {
    return { label: "DIAGNÓSTICO", className: "bg-orange-100 text-orange-900", dot: "bg-amber-400" };
  }
  if (kind === "consult") {
    return { label: "CONSULTA", className: "bg-teal-100 text-teal-900", dot: "bg-emerald-500" };
  }
  return { label: "ADMIN", className: "bg-amber-50 text-amber-900", dot: "bg-orange-400" };
}

function formatTimePt(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function urgencySubtitle(row: RiskRow): string {
  const iso = row.lastSymptomAt;
  if (!iso) return "Sem registo recente";
  const diffMin = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diffMin < 15) return "VENCE AGORA";
  if (diffMin < 60) return `Há ${Math.max(1, Math.floor(diffMin))} min`;
  if (diffMin < 1440) return `Há ${Math.floor(diffMin / 60)} h`;
  return "Rever triagem";
}

function documentTypeLabel(t: string): string {
  if (t === "blood_test") return "Painel laboratorial";
  if (t === "biopsy") return "Biópsia / anatomia";
  if (t === "scan") return "Imagem";
  return "Documento";
}

/** Painel à direita quando nenhum paciente está selecionado na rota `/paciente` — centro de comando de riscos. */
export function DashboardWorkspacePlaceholder() {
  const {
    rows,
    busy,
    loadError,
    loadTriage,
    kpiStats,
    pendingLinkRequests,
    hospitalsMeta,
    staffProfile,
    staffAvatarBust,
  } = useOncoCare();

  const hospitalNameById = useMemo(
    () => new Map(hospitalsMeta.map((h) => [h.id, h.display_name?.trim() || h.name])),
    [hospitalsMeta]
  );

  const hospitalIds = useMemo(() => hospitalsMeta.map((h) => h.id), [hospitalsMeta]);

  const [activeCyclePatients, setActiveCyclePatients] = useState<number | null>(null);
  const [severeSymptoms24h, setSevereSymptoms24h] = useState<number | null>(null);

  const [weeklyChemoSessions, setWeeklyChemoSessions] = useState<number | null>(null);
  const [weeklyFollowups, setWeeklyFollowups] = useState<number | null>(null);
  const [admissionsTotal, setAdmissionsTotal] = useState<number | null>(null);
  const [recoveriesTotal, setRecoveriesTotal] = useState<number | null>(null);
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointmentRow[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [labRows, setLabRows] = useState<LabReviewRow[]>([]);
  const [labLoading, setLabLoading] = useState(false);
  const [labUsedFallback, setLabUsedFallback] = useState(false);
  const [staffExtra, setStaffExtra] = useState<StaffExtra | null>(null);
  const [onDuty, setOnDuty] = useState(true);
  const [dashExtrasLoading, setDashExtrasLoading] = useState(false);

  const patientIds = useMemo(() => rows.map((r) => r.id), [rows]);

  const reloadStaffExtra = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      setStaffExtra(null);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("job_title, phone_e164, email_display")
      .eq("id", uid)
      .maybeSingle();
    if (error || !data) {
      setStaffExtra(null);
      return;
    }
    setStaffExtra({
      job_title: typeof data.job_title === "string" ? data.job_title : null,
      phone_e164: typeof data.phone_e164 === "string" ? data.phone_e164 : null,
      email_display: typeof data.email_display === "string" ? data.email_display : null,
    });
  }, []);

  useEffect(() => {
    void reloadStaffExtra();
  }, [reloadStaffExtra, staffProfile?.full_name]);

  useEffect(() => {
    if (patientIds.length === 0) {
      setActiveCyclePatients(0);
      setSevereSymptoms24h(0);
      return;
    }
    let cancelled = false;
    const run = async () => {
      const d = new Date();
      d.setDate(d.getDate() - 21);
      const startIso = d.toISOString().slice(0, 10);
      const since24 = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

      const [cyclesRes, severeRes] = await Promise.all([
        supabase
          .from("treatment_cycles")
          .select("patient_id")
          .in("patient_id", patientIds)
          .eq("status", "active")
          .gte("start_date", startIso),
        supabase
          .from("symptom_logs")
          .select("id", { count: "exact", head: true })
          .in("patient_id", patientIds)
          .eq("severity", "severe")
          .gte("logged_at", since24),
      ]);

      if (cancelled) return;

      if (!cyclesRes.error && cyclesRes.data) {
        const distinct = new Set((cyclesRes.data as { patient_id: string }[]).map((x) => x.patient_id));
        setActiveCyclePatients(distinct.size);
      } else {
        setActiveCyclePatients(null);
      }

      if (!severeRes.error && typeof severeRes.count === "number") {
        setSevereSymptoms24h(severeRes.count);
      } else {
        setSevereSymptoms24h(null);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [patientIds]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (hospitalIds.length === 0) {
        setWeeklyChemoSessions(0);
        setWeeklyFollowups(0);
        setAdmissionsTotal(0);
        setRecoveriesTotal(0);
        setChartPoints(last7DayKeys().map((iso) => ({ name: shortWeekdayPt(iso), adm: 0, alta: 0, iso })));
        setDashExtrasLoading(false);
        return;
      }
      setDashExtrasLoading(true);
      const weekStr = weekAgoDateStr();
      const now = new Date();
      const weekEnd = new Date(now.getTime() + 7 * 86400000).toISOString();

      const [chemoRes, followRes, admRes, recRes, eventsRes] = await Promise.all([
        patientIds.length === 0
          ? Promise.resolve({ count: 0 as number | null, error: null })
          : supabase
              .from("treatment_cycles")
              .select("id", { count: "exact", head: true })
              .in("patient_id", patientIds)
              .eq("status", "active")
              .gte("start_date", weekStr),
        patientIds.length === 0
          ? Promise.resolve({ count: 0 as number | null, error: null })
          : supabase
              .from("patient_appointments")
              .select("id", { count: "exact", head: true })
              .in("patient_id", patientIds)
              .gte("starts_at", now.toISOString())
              .lt("starts_at", weekEnd),
        supabase
          .from("patient_hospital_links")
          .select("id", { count: "exact", head: true })
          .in("hospital_id", hospitalIds)
          .eq("status", "approved"),
        supabase
          .from("patient_hospital_links")
          .select("id", { count: "exact", head: true })
          .in("hospital_id", hospitalIds)
          .eq("status", "revoked"),
        supabase
          .from("patient_hospital_link_events")
          .select("new_status, created_at")
          .in("hospital_id", hospitalIds)
          .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
          .in("new_status", ["approved", "revoked"]),
      ]);

      if (cancelled) return;

      setWeeklyChemoSessions(typeof chemoRes.count === "number" ? chemoRes.count : null);
      setWeeklyFollowups(typeof followRes.count === "number" ? followRes.count : null);
      setAdmissionsTotal(typeof admRes.count === "number" ? admRes.count : null);
      setRecoveriesTotal(typeof recRes.count === "number" ? recRes.count : null);

      const dayKeys = last7DayKeys();
      const admByDay = new Map<string, number>();
      const altaByDay = new Map<string, number>();
      for (const k of dayKeys) {
        admByDay.set(k, 0);
        altaByDay.set(k, 0);
      }
      if (!eventsRes.error && eventsRes.data) {
        for (const ev of eventsRes.data as { new_status: string; created_at: string }[]) {
          const day = ev.created_at.slice(0, 10);
          if (!admByDay.has(day)) continue;
          if (ev.new_status === "approved") admByDay.set(day, (admByDay.get(day) ?? 0) + 1);
          if (ev.new_status === "revoked") altaByDay.set(day, (altaByDay.get(day) ?? 0) + 1);
        }
      }
      setChartPoints(
        dayKeys.map((iso) => ({
          iso,
          name: shortWeekdayPt(iso),
          adm: admByDay.get(iso) ?? 0,
          alta: altaByDay.get(iso) ?? 0,
        }))
      );
      setDashExtrasLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [hospitalIds, patientIds]);

  useEffect(() => {
    let cancelled = false;
    const loadToday = async () => {
      setAppointmentsLoading(true);
      const { start, end } = startEndOfToday();
      const { data, error } = await supabase
        .from("patient_appointments")
        .select("id, starts_at, title, kind, notes")
        .gte("starts_at", start)
        .lt("starts_at", end)
        .order("starts_at", { ascending: true })
        .limit(40);
      if (cancelled) return;
      setAppointmentsLoading(false);
      if (error || !data) {
        setTodayAppointments([]);
        return;
      }
      setTodayAppointments(data as TodayAppointmentRow[]);
    };
    void loadToday();
    return () => {
      cancelled = true;
    };
  }, [hospitalIds.join(","), busy]);

  useEffect(() => {
    let cancelled = false;
    const loadLabs = async () => {
      setLabLoading(true);
      setLabUsedFallback(false);
      const { data, error } = await supabase
        .from("medical_documents")
        .select(
          "id, document_type, uploaded_at, patients ( profiles!patients_profile_id_fkey ( full_name ) )"
        )
        .eq("document_type", "blood_test")
        .order("uploaded_at", { ascending: false })
        .limit(4);
      if (cancelled) return;
      setLabLoading(false);
      if (error || !data?.length) {
        setLabRows(LAB_FALLBACK);
        setLabUsedFallback(true);
        return;
      }
      const mapped: LabReviewRow[] = (data as {
        id: string;
        document_type: string;
        patients?: { profiles?: { full_name?: string } | { full_name?: string }[] } | null;
      }[]).map((row) => ({
        id: row.id,
        label: documentTypeLabel(row.document_type),
        patientName: profileName(row.patients?.profiles as Parameters<typeof profileName>[0]),
      }));
      setLabRows(mapped);
    };
    void loadLabs();
    return () => {
      cancelled = true;
    };
  }, [hospitalIds.join(","), busy]);

  const criticalCount = useMemo(() => rows.filter((r) => clinicalTier(r) === "critical").length, [rows]);
  const clinicalPerfPct = useMemo(() => {
    if (rows.length === 0) return 100;
    const crit = rows.filter((r) => clinicalTier(r) === "critical").length;
    return Math.round(((rows.length - crit) / rows.length) * 100);
  }, [rows]);

  const urgentRows = useMemo(() => {
    return rows
      .filter((r) => clinicalTier(r) === "critical")
      .slice()
      .sort((a, b) => {
        const ta = a.lastSymptomAt ? new Date(a.lastSymptomAt).getTime() : 0;
        const tb = b.lastSymptomAt ? new Date(b.lastSymptomAt).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 4);
  }, [rows]);

  const welcomeFirst = staffProfile?.full_name ? firstName(staffProfile.full_name) : "equipe";
  const staffDisplayName = staffProfile?.full_name?.trim() || "Profissional";
  const staffInitials = initialsFromName(staffDisplayName);
  const avatarUrl =
    staffProfile?.avatar_url && staffProfile.avatar_url.trim()
      ? `${staffProfile.avatar_url.split("?")[0]}?v=${staffAvatarBust}`
      : null;
  const jobTitle = staffExtra?.job_title?.trim() || roleLabel(staffProfile?.role);

  const weekLabel = useMemo(() => {
    const now = new Date();
    const w = Math.ceil(now.getDate() / 7);
    return `${now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} · Semana ${w}`;
  }, []);

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 isolate">
      {loadError ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : null}

      {!busy && pendingLinkRequests.length > 0 ? (
        <PendingStaffLinksPanel items={pendingLinkRequests} hospitalNameById={hospitalNameById} />
      ) : null}

      <NadirAlertBanner rows={rows} />

      {/* A — Boas-vindas + KPIs inline */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-100/80 bg-white/60 p-5 shadow-sm backdrop-blur-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
              Bem-vindo{staffProfile?.full_name ? `, ${welcomeFirst}` : ""}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Aqui está o que está a acontecer no OncoCare hoje — triagem, vínculos e agenda clínica.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <div className="flex items-center gap-2 rounded-2xl border border-orange-100 bg-orange-50/90 px-3 py-2 shadow-sm">
              <Stethoscope className="size-4 shrink-0 text-orange-600" aria-hidden />
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-orange-800/80">Pacientes ativos</p>
                <p className="text-lg font-black tabular-nums text-slate-900">{busy ? "—" : kpiStats.total}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50/90 px-3 py-2 shadow-sm">
              <Syringe className="size-4 shrink-0 text-amber-600" aria-hidden />
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-amber-900/80">Sessões quimio (7d)</p>
                <p className="text-lg font-black tabular-nums text-slate-900">
                  {dashExtrasLoading || weeklyChemoSessions === null ? "—" : weeklyChemoSessions}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/90 px-3 py-2 shadow-sm">
              <ClipboardList className="size-4 shrink-0 text-emerald-600" aria-hidden />
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-emerald-900/80">Acompanhamentos</p>
                <p className="text-lg font-black tabular-nums text-slate-900">
                  {dashExtrasLoading || weeklyFollowups === null ? "—" : weeklyFollowups}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-100/80 pt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
            <Activity className="size-3.5 text-rose-500" aria-hidden />
            Críticos: {busy ? "—" : String(criticalCount).padStart(2, "0")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
            <HeartPulse className="size-3.5 text-amber-500" aria-hidden />
            Nadir (24h): {busy ? "—" : String(kpiStats.nadir).padStart(2, "0")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
            <TrendingUp className="size-3.5 text-emerald-500" aria-hidden />
            Adesão média: —
          </span>
        </div>
      </div>

      {/* B + C — Perfil + performance + labs */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="rounded-3xl border border-slate-100 bg-white/65 p-5 shadow-sm backdrop-blur-sm lg:col-span-4">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
            <PatientFaceThumb url={avatarUrl} initials={staffInitials} className="size-20 shrink-0 sm:mr-4" />
            <div className="mt-4 min-w-0 sm:mt-0">
              <p className="text-lg font-black text-slate-900">{staffDisplayName}</p>
              <p className="mt-0.5 text-sm font-semibold text-teal-700">{jobTitle}</p>
              <div className="mt-3 flex items-center justify-center gap-2 sm:justify-start">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide",
                    onDuty ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                  )}
                >
                  {onDuty ? "Em serviço" : "Fora de serviço"}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={onDuty}
                  onClick={() => setOnDuty((v) => !v)}
                  className={cn(
                    "relative h-6 w-11 rounded-full border-2 transition-colors",
                    onDuty ? "border-emerald-400 bg-emerald-500" : "border-slate-300 bg-slate-200"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform",
                      onDuty ? "left-5" : "left-0.5"
                    )}
                  />
                </button>
              </div>
              <p className="mt-2 text-[0.7rem] text-muted-foreground">Plantão clínico (indicador local)</p>
            </div>
          </div>
          <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
            {staffExtra?.phone_e164 ? (
              <p className="flex items-center gap-2 text-slate-700">
                <Phone className="size-4 shrink-0 text-slate-400" aria-hidden />
                <span className="font-medium">{staffExtra.phone_e164}</span>
              </p>
            ) : null}
            {staffExtra?.email_display ? (
              <p className="flex items-center gap-2 text-slate-700">
                <Mail className="size-4 shrink-0 text-slate-400" aria-hidden />
                <span className="truncate font-medium">{staffExtra.email_display}</span>
              </p>
            ) : null}
            {!staffExtra?.phone_e164 && !staffExtra?.email_display ? (
              <p className="text-xs text-muted-foreground">Complete o contacto nas definições do perfil.</p>
            ) : null}
            {staffProfile?.professional_license ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Briefcase className="size-3.5 shrink-0" aria-hidden />
                Registo: {staffProfile.professional_license}
              </p>
            ) : null}
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-4 lg:col-span-8">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="rounded-2xl border border-slate-100 bg-white/65 p-5 shadow-sm backdrop-blur-sm">
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">Desempenho clínico</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <div>
                  <p className="text-3xl font-black tabular-nums text-slate-900">{busy ? "—" : `${clinicalPerfPct}%`}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <TrendingUp className="size-3.5" aria-hidden />
                    {rows.length === 0 ? "Sem pacientes na fila" : `${rows.length - criticalCount} estáveis`}
                  </p>
                  <p className="mt-1 text-[0.7rem] text-muted-foreground">Pacientes fora de triagem crítica</p>
                </div>
              </div>
            </Card>
            <div className="grid grid-cols-2 gap-3">
              <Card className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm backdrop-blur-sm">
                <p className="text-[0.65rem] font-bold uppercase text-slate-500">Admissões</p>
                <p className="mt-1 text-2xl font-black tabular-nums text-slate-900">
                  {dashExtrasLoading || admissionsTotal === null ? "—" : admissionsTotal}
                </p>
                <p className="text-[0.65rem] text-muted-foreground">Vínculos aprovados</p>
              </Card>
              <Card className="rounded-2xl border border-emerald-100/80 bg-emerald-50/50 p-4 shadow-sm backdrop-blur-sm">
                <p className="text-[0.65rem] font-bold uppercase text-emerald-800/90">Recuperações</p>
                <p className="mt-1 text-2xl font-black tabular-nums text-emerald-900">
                  {dashExtrasLoading || recoveriesTotal === null ? "—" : recoveriesTotal}
                </p>
                <p className="text-[0.65rem] text-emerald-800/80">Vínculos revogados / alta</p>
              </Card>
            </div>
          </div>

          <Card className="rounded-2xl border border-slate-100 bg-white/65 p-5 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">Revisão laboratorial</p>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase text-amber-900">
                Novo
              </span>
            </div>
            {labLoading ? (
              <div className="mt-3 space-y-2" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <SkeletonPulse key={i} rounded="xl" className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {labRows.map((row, idx) => (
                  <li key={row.id} className="flex items-center justify-between gap-2 py-2.5 first:pt-0">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-bold text-slate-500">#{String(idx + 451).slice(-3)}</p>
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {row.label} — {row.patientName}
                      </p>
                    </div>
                    <Beaker className="size-4 shrink-0 text-slate-300" aria-hidden />
                  </li>
                ))}
              </ul>
            )}
            {labUsedFallback ? (
              <p className="mt-2 text-[0.65rem] text-amber-800/90">Sem exames laboratoriais recentes na base — exemplo estático.</p>
            ) : null}
            <Link
              to="/pacientes"
              className="mt-3 inline-flex text-xs font-bold text-teal-700 underline-offset-2 hover:underline"
            >
              Ver todos os exames
            </Link>
          </Card>
        </div>
      </div>

      {/* D — Resumo semanal */}
      <Card className="rounded-3xl border border-slate-100 bg-white/65 p-5 shadow-sm backdrop-blur-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-900">Resumo semanal</h3>
            <p className="text-sm text-muted-foreground">Admissões vs altas de pacientes (eventos de vínculo)</p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#0f766e]" aria-hidden />
              Admissões
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#94a3b8]" aria-hidden />
              Altas
            </span>
          </div>
        </div>
        <div
          className="h-[220px] w-full min-w-0"
          onWheel={(e) => {
            const scroller = e.currentTarget.closest<HTMLElement>("[class*=overflow-y-auto]");
            if (scroller) scroller.scrollTop += e.deltaY;
          }}
        >
          <ResponsiveContainer width="100%" height="100%" debounce={50} minWidth={0}>
            <AreaChart data={chartPoints} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillAdm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillAlta" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200/80" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis allowDecimals={false} width={28} tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <RechartsTooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                formatter={(value, name) => {
                  const n = typeof value === "number" ? value : Number(value);
                  const label = name === "adm" ? "Admissões" : "Altas";
                  return [Number.isFinite(n) ? n : 0, label];
                }}
              />
              <Area type="monotone" dataKey="adm" stroke="#0f766e" fill="url(#fillAdm)" strokeWidth={2} name="adm" />
              <Area type="monotone" dataKey="alta" stroke="#94a3b8" fill="url(#fillAlta)" strokeWidth={2} name="alta" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* E + F — Cronograma + urgentes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl border border-slate-100 bg-white/65 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-black tracking-tight text-slate-900">Cronograma de tarefas</h3>
              <p className="mt-0.5 text-sm capitalize text-muted-foreground">{weekLabel}</p>
            </div>
            <div className="flex gap-1">
              <span className="flex size-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500">
                <CalendarClock className="size-4" aria-hidden />
              </span>
            </div>
          </div>
          <div className="relative mt-4 max-h-72 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]">
            {appointmentsLoading ? (
              <div className="space-y-3 py-4" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <SkeletonPulse key={i} rounded="xl" className="h-14 w-full" />
                ))}
              </div>
            ) : todayAppointments.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 py-8 text-center text-sm text-muted-foreground">
                Sem consultas ou lembretes agendados para hoje.
              </p>
            ) : (
              <ul className="space-y-0">
                {todayAppointments.map((ap) => {
                  const badge = appointmentBadge(ap.title, ap.kind);
                  return (
                    <li key={ap.id} className="relative flex gap-3 border-l-2 border-slate-200 py-3 pl-5">
                      <span
                        className={cn("absolute -left-[5px] top-5 size-2.5 rounded-full ring-2 ring-white", badge.dot)}
                        aria-hidden
                      />
                      <div className="w-14 shrink-0 text-sm font-black tabular-nums text-slate-700">
                        {formatTimePt(ap.starts_at)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">{ap.title}</p>
                        {ap.notes ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{ap.notes}</p> : null}
                        <span className={cn("mt-1 inline-block rounded-md px-2 py-0.5 text-[0.6rem] font-bold", badge.className)}>
                          {badge.label}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>

        <Card className="rounded-3xl border border-slate-100 bg-white/65 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-black tracking-tight text-slate-900">Revisões urgentes</h3>
            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase text-rose-800">
              Ativo
            </span>
          </div>
          {urgentRows.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 py-8 text-center text-sm text-muted-foreground">
              Sem revisões urgentes neste momento.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {urgentRows.map((row, i) => {
                const dot = i === 1 ? "bg-amber-500" : "bg-rose-500";
                return (
                  <li
                    key={row.id}
                    className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-3"
                  >
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", dot)} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900">{profileName(row.profiles)}</p>
                      <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-rose-700">
                        {urgencySubtitle(row)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {criticalCount > 0 ? (
            <div
              className="mt-4 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-3 text-sm text-rose-900"
              role="status"
            >
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-600" aria-hidden />
              <p>
                <span className="font-bold">Alerta do sistema:</span> {criticalCount} paciente(s) em triagem crítica —
                priorize revisão de sintomas e sinais vitais.
              </p>
            </div>
          ) : null}
        </Card>
      </div>

      {/* G — Cards operacionais (ciclo, adesão, sintomas, infusão) */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border border-slate-100 bg-white/60 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-400">Ciclo ativo (21 d)</p>
              {busy || activeCyclePatients === null ? (
                <div className="mt-1 space-y-2 pt-0.5" aria-hidden>
                  <SkeletonPulse rounded="xl" className="h-8 w-24" />
                  <SkeletonPulse rounded="xl" className="h-4 w-full max-w-[14rem]" />
                </div>
              ) : (
                <>
                  <p className="mt-1 text-2xl font-black tabular-nums text-slate-900 sm:text-3xl">{String(activeCyclePatients)}</p>
                  <p className="mt-1 text-[0.7rem] text-muted-foreground">Pacientes com ciclo iniciado nos últimos 21 dias</p>
                </>
              )}
            </div>
            <div className="rounded-2xl bg-violet-100/80 p-2.5 text-violet-600">
              <Syringe className="size-5" strokeWidth={2} />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-100 bg-white/60 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-400">Adesão à medicação</p>
              {busy ? (
                <div className="mt-1 space-y-2 pt-0.5" aria-hidden>
                  <SkeletonPulse rounded="xl" className="h-8 w-24" />
                  <SkeletonPulse rounded="xl" className="h-4 w-full max-w-[14rem]" />
                </div>
              ) : (
                <>
                  <p className="mt-1 text-2xl font-black tabular-nums text-slate-400 sm:text-3xl">—</p>
                  <p className="mt-1 text-[0.7rem] text-muted-foreground">Tomados vs agendados (em breve)</p>
                </>
              )}
            </div>
            <div className="rounded-2xl bg-emerald-100/80 p-2.5 text-emerald-600">
              <Activity className="size-5" strokeWidth={2} />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-100 bg-white/60 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-400">Sintomas severos (24h)</p>
              {busy || severeSymptoms24h === null ? (
                <div className="mt-1 space-y-2 pt-0.5" aria-hidden>
                  <SkeletonPulse rounded="xl" className="h-8 w-24" />
                  <SkeletonPulse rounded="xl" className="h-4 w-full max-w-[14rem]" />
                </div>
              ) : (
                <>
                  <p className="mt-1 text-2xl font-black tabular-nums text-rose-600 sm:text-3xl">{String(severeSymptoms24h)}</p>
                  <p className="mt-1 text-[0.7rem] text-muted-foreground">Registos com gravidade &quot;severe&quot; na janela</p>
                </>
              )}
            </div>
            <div className="rounded-2xl bg-rose-100/80 p-2.5 text-rose-600">
              <Flame className="size-5" strokeWidth={2} />
            </div>
          </div>
        </Card>

        <Link to="/operacao-infusao" className="group block">
          <Card className="h-full rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50/80 to-white/60 p-5 shadow-sm backdrop-blur-sm transition-all hover:border-teal-400 hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-teal-700/80">Agenda de infusão</p>
                {busy ? (
                  <div className="mt-2 space-y-2" aria-hidden>
                    <SkeletonPulse rounded="xl" className="h-5 w-40" />
                    <SkeletonPulse rounded="xl" className="h-4 w-full max-w-[12rem]" />
                    <SkeletonPulse rounded="xl" className="mt-3 h-4 w-28" />
                  </div>
                ) : (
                  <>
                    <p className="mt-2 text-sm font-bold text-slate-800">Operação e cadeiras</p>
                    <p className="mt-1 text-[0.7rem] text-muted-foreground">Ver ocupação e recursos do dia</p>
                    <p className="mt-3 flex items-center gap-1 text-xs font-bold text-teal-700">
                      Abrir painel
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </p>
                  </>
                )}
              </div>
              <div className="rounded-2xl bg-teal-100/90 p-2.5 text-teal-700">
                <LayoutDashboard className="size-5" strokeWidth={2} />
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* H — Estado vazio (sem pacientes aprovados) */}
      {rows.length === 0 ? (
        <div className="mx-auto flex w-full max-w-lg flex-col items-center justify-center gap-4 rounded-2xl border border-slate-100 bg-white/60 p-8 text-center shadow-sm backdrop-blur-sm sm:p-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
            <LayoutDashboard className="size-8 text-slate-500" strokeWidth={1.5} />
          </div>
          <div className="max-w-sm space-y-2">
            {!busy ? (
              <>
                <p className="text-lg font-semibold tracking-tight text-slate-800">Nenhum paciente na fila (aprovados)</p>
                <p className="text-sm leading-relaxed text-slate-500">
                  {pendingLinkRequests.length > 0
                    ? "Há pedidos de vínculo em cima à espera da aprovação do paciente no app. Depois de aprovados, o doente aparece aqui automaticamente."
                    : "Quando um doente solicitar vínculo com o hospital pelo código no app Aura e a equipa aprovar, o paciente aparece aqui e o dossié clínico ficará disponível neste painel."}
                </p>
              </>
            ) : (
              <div className="space-y-2 pt-2" aria-hidden>
                <span className="sr-only">A carregar dados da triagem…</span>
                {[0, 1, 2].map((i) => (
                  <SkeletonPulse key={i} rounded="2xl" className="h-16 w-full" />
                ))}
              </div>
            )}
          </div>
          <Button type="button" variant="outline" size="sm" className="rounded-full" disabled={busy} onClick={() => void loadTriage()}>
            <RefreshCw className="mr-2 size-4" />
            Atualizar dados
          </Button>
        </div>
      ) : null}
    </div>
  );
}
