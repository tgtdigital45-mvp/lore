import type { InfusionBookingRow, InfusionResourceRow } from "@/hooks/useInfusionAgenda";

export function patientDisplayName(b: InfusionBookingRow): string {
  const row = b.patients;
  const p = Array.isArray(row) ? row[0] : row;
  const raw = p?.profiles;
  if (!raw) return "—";
  if (Array.isArray(raw)) return raw[0]?.full_name?.trim() || "—";
  return raw.full_name?.trim() || "—";
}

export function kindLabel(k: InfusionResourceRow["kind"]): string {
  return k === "chair" ? "Cadeira" : "Maca";
}

export function bookingsForResource(resourceId: string, bookings: InfusionBookingRow[]): InfusionBookingRow[] {
  return bookings
    .filter((b) => b.resource_id === resourceId)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
}

/** Reserva em curso neste momento (início ≤ agora &lt; fim). */
export function findActiveBookingForResource(
  resourceId: string,
  bookings: InfusionBookingRow[],
  nowMs: number
): InfusionBookingRow | null {
  const list = bookingsForResource(resourceId, bookings);
  return (
    list.find((b) => {
      const s = Date.parse(b.starts_at);
      const e = Date.parse(b.ends_at);
      return nowMs >= s && nowMs < e;
    }) ?? null
  );
}

/** Próxima reserva com início depois de agora (não inclui a em curso). */
export function findNextFutureBookingForResource(
  resourceId: string,
  bookings: InfusionBookingRow[],
  nowMs: number
): InfusionBookingRow | null {
  const list = bookingsForResource(resourceId, bookings);
  const future = list.filter((b) => Date.parse(b.starts_at) > nowMs);
  if (future.length === 0) return null;
  return future.reduce((a, b) => (Date.parse(a.starts_at) <= Date.parse(b.starts_at) ? a : b));
}

export type ResourcePreview = {
  tone: "maintenance" | "in_session" | "next_up" | "free";
  title: string;
  subtitle: string;
};

export function getResourcePreview(r: InfusionResourceRow, bookings: InfusionBookingRow[], nowMs: number): ResourcePreview {
  if (r.operational_status === "maintenance") {
    return {
      tone: "maintenance",
      title: "Manutenção",
      subtitle: "Indisponível para agendamentos",
    };
  }

  const active = findActiveBookingForResource(r.id, bookings, nowMs);
  if (active) {
    const name = patientDisplayName(active);
    return {
      tone: "in_session",
      title: "Em sessão",
      subtitle: name === "—" ? "Paciente não identificado" : name,
    };
  }

  const next = findNextFutureBookingForResource(r.id, bookings, nowMs);
  if (next) {
    const name = patientDisplayName(next);
    const t = new Date(next.starts_at).toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    return {
      tone: "next_up",
      title: "Próximo",
      subtitle: name === "—" ? `Às ${t}` : `${name} · ${t}`,
    };
  }

  return {
    tone: "free",
    title: "Disponível",
    subtitle: "Sem reservas agendadas",
  };
}
