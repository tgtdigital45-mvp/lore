import type { InfusionBookingRow, InfusionResourceRow } from "@/hooks/useInfusionAgenda";

export function infusionPatientName(b: InfusionBookingRow): string {
  const p = b.patients;
  if (!p) return "—";
  const prof = Array.isArray(p) ? p[0]?.profiles : p.profiles;
  const fn = Array.isArray(prof) ? prof[0]?.full_name : prof?.full_name;
  return fn?.trim() || "—";
}

function bookingsOverlap(a: InfusionBookingRow, b: InfusionBookingRow): boolean {
  const a1 = new Date(a.starts_at).getTime();
  const a2 = new Date(a.ends_at).getTime();
  const b1 = new Date(b.starts_at).getTime();
  const b2 = new Date(b.ends_at).getTime();
  return a1 < b2 && b1 < a2;
}

/** Próxima marcação com início estritamente depois de `nowMs` (não inclui sessão em curso). */
export function nextScheduledBooking(
  resourceId: string,
  nowMs: number,
  bookings: InfusionBookingRow[]
): InfusionBookingRow | null {
  const future = bookings
    .filter((b) => b.resource_id === resourceId && new Date(b.starts_at).getTime() > nowMs)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  return future[0] ?? null;
}

export function resourceLabelById(resources: InfusionResourceRow[], resourceId: string): string {
  return resources.find((r) => r.id === resourceId)?.label ?? "Recurso";
}

/** Deteta sobreposição de marcações no mesmo recurso. */
export function hasOverlappingBookings(bookings: InfusionBookingRow[]): { resourceId: string } | null {
  const byRes = new Map<string, InfusionBookingRow[]>();
  for (const b of bookings) {
    const list = byRes.get(b.resource_id) ?? [];
    list.push(b);
    byRes.set(b.resource_id, list);
  }
  for (const [rid, list] of byRes) {
    const sorted = [...list].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (bookingsOverlap(sorted[i], sorted[j])) return { resourceId: rid };
      }
    }
  }
  return null;
}

export type OperationalFeedItem = {
  id: string;
  kind: "alert" | "notice";
  variant: "danger" | "warn" | "info";
  title: string;
  body: string;
};

const IMMINENT_MS = 22 * 60 * 1000;

/**
 * Alertas (atenção imediata) e avisos (contexto operacional) para a sala de infusão.
 */
export function buildOperationalFeed(
  resources: InfusionResourceRow[],
  bookings: InfusionBookingRow[],
  nowMs: number,
  horizonMs: number,
  error: string | null
): { alerts: OperationalFeedItem[]; notices: OperationalFeedItem[] } {
  const alerts: OperationalFeedItem[] = [];
  const notices: OperationalFeedItem[] = [];

  if (error) {
    alerts.push({
      id: "feed-err",
      kind: "alert",
      variant: "danger",
      title: "Erro ao sincronizar",
      body: error,
    });
  }

  const overlap = hasOverlappingBookings(bookings);
  if (overlap) {
    const label = resourceLabelById(resources, overlap.resourceId);
    alerts.push({
      id: "feed-overlap",
      kind: "alert",
      variant: "danger",
      title: "Conflito de agenda",
      body: `Existem marcações sobrepostas em ${label}. Corrija na agenda antes de iniciar sessões.`,
    });
  }

  for (const r of resources) {
    if (r.operational_status === "maintenance") {
      alerts.push({
        id: `feed-maint-${r.id}`,
        kind: "alert",
        variant: "warn",
        title: "Manutenção",
        body: `${r.label} está indisponível para marcações até concluir a manutenção.`,
      });
    }
  }

  const horizonEnd = nowMs + horizonMs;
  const inHorizon = bookings.filter((b) => {
    const s = new Date(b.starts_at).getTime();
    return s >= nowMs && s <= horizonEnd;
  });

  let imminentCount = 0;
  for (const b of inHorizon) {
    const s = new Date(b.starts_at).getTime();
    const delta = s - nowMs;
    if (delta > 0 && delta <= IMMINENT_MS && imminentCount < 8) {
      imminentCount += 1;
      const mins = Math.max(1, Math.round(delta / 60_000));
      const resLabel = resourceLabelById(resources, b.resource_id);
      alerts.push({
        id: `feed-soon-${b.id}`,
        kind: "alert",
        variant: "warn",
        title: "Início iminente",
        body: `${infusionPatientName(b)} — ${resLabel} em cerca de ${mins} min.`,
      });
    }
  }

  const activeOperational = resources.filter((r) => r.operational_status !== "maintenance");
  const occupied = activeOperational.filter((r) =>
    bookings.some((b) => {
      if (b.resource_id !== r.id) return false;
      const s = new Date(b.starts_at).getTime();
      const e = new Date(b.ends_at).getTime();
      return nowMs >= s && nowMs <= e;
    })
  ).length;

  if (activeOperational.length > 0 && occupied === activeOperational.length) {
    notices.push({
      id: "feed-full",
      kind: "notice",
      variant: "info",
      title: "Capacidade em uso",
      body: "Todos os postos operacionais têm sessão em curso neste momento.",
    });
  }

  if (inHorizon.length >= 12) {
    notices.push({
      id: "feed-busy",
      kind: "notice",
      variant: "info",
      title: "Janela movimentada",
      body: `${inHorizon.length} marcações nas próximas horas — antecipe preparação de fármacos e material.`,
    });
  } else if (inHorizon.length > 0 && inHorizon.length <= 2) {
    notices.push({
      id: "feed-light",
      kind: "notice",
      variant: "info",
      title: "Agenda alargada",
      body: "Poucas marcações na janela de 6h — oportunidade para reorganizar postos ou antecipar preparativos.",
    });
  }

  const paxman = resources.filter((r) => r.paxman_cryotherapy && r.operational_status === "active");
  if (paxman.length > 0) {
    notices.push({
      id: "feed-paxman",
      kind: "notice",
      variant: "info",
      title: "Crioterapia couro cabeludo",
      body: `${paxman.map((r) => r.label).join(", ")} — postos com capacidade PAXMAN; confirmar indicação por protocolo.`,
    });
  }

  const sev = { danger: 0, warn: 1, info: 2 } as const;
  alerts.sort((a, b) => sev[a.variant] - sev[b.variant]);

  return { alerts, notices };
}

export type ChairStatus = {
  label: string;
  className: string;
  /** Nome do doente quando a cadeira está em uso. */
  activePatient?: string;
};

export function statusForChair(
  chair: InfusionResourceRow,
  now: number,
  bookings: InfusionBookingRow[]
): ChairStatus {
  if (chair.operational_status === "maintenance") {
    return { label: "Manutenção", className: "bg-slate-600 text-white shadow-sm" };
  }
  const here = bookings.filter((b) => b.resource_id === chair.id);
  const active = here.find((b) => {
    const s = new Date(b.starts_at).getTime();
    const e = new Date(b.ends_at).getTime();
    return now >= s && now <= e;
  });
  if (active) {
    return {
      label: "Em uso",
      className: "bg-sky-600 text-white shadow-sm ring-2 ring-sky-200/80",
      activePatient: infusionPatientName(active),
    };
  }
  const soon = here.find((b) => {
    const s = new Date(b.starts_at).getTime();
    return s > now && s - now < 6 * 3600 * 1000;
  });
  if (soon) {
    return { label: "Reservada", className: "bg-amber-400 text-amber-950 shadow-sm ring-2 ring-amber-200/90" };
  }
  return { label: "Disponível", className: "bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-200/70" };
}
