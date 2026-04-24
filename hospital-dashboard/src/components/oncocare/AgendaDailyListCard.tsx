"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarClock, ChevronRight, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { InfusionBookingRow, InfusionResourceRow } from "@/hooks/useInfusionAgenda";
import { patientDisplayName } from "@/lib/infusionResourceUi";

function bookingsStartingToday(bookings: InfusionBookingRow[]): InfusionBookingRow[] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = start + 86400000;
  return bookings
    .filter((b) => {
      const t = Date.parse(b.starts_at);
      return t >= start && t < end;
    })
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
}

function formatTimePt(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function todayTitlePt(): string {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type Props = {
  bookings: InfusionBookingRow[];
  resources: InfusionResourceRow[];
};

export function AgendaDailyListCard({ bookings, resources }: Props) {
  const rows = useMemo(() => bookingsStartingToday(bookings), [bookings]);

  const resourceLabel = (id: string) => resources.find((r) => r.id === id)?.label ?? "Recurso";

  return (
    <Card className="sticky top-20 rounded-[28px] border-[3px] border-[#E0E7FF] bg-gradient-to-b from-[#FAFBFF] to-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#6366F1]/10 text-[#4F46E5]">
          <CalendarClock className="size-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black tracking-tight text-foreground">Listagem do dia</h2>
          <p className="mt-0.5 capitalize text-sm text-muted-foreground">{todayTitlePt()}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-[#E2E8F0] bg-white/80 px-4 py-8 text-center text-sm text-muted-foreground">
          Sem reservas agendadas para hoje.
        </p>
      ) : (
        <ul className="mt-5 max-h-[min(60vh,520px)] divide-y divide-[#EEF2FF] overflow-y-auto pr-1">
          {rows.map((b) => {
            const name = patientDisplayName(b);
            const chair = resourceLabel(b.resource_id);
            const infusion = b.medication_notes?.trim() || null;
            return (
              <li key={b.id} className="py-3 first:pt-0">
                <Link
                  href={`/agenda/recurso/${b.resource_id}`}
                  className="group flex gap-3 rounded-2xl p-2 transition hover:bg-[#F5F3FF]/80"
                >
                  <div className="w-14 shrink-0 text-center">
                    <p className="text-lg font-black tabular-nums text-[#4F46E5]">{formatTimePt(b.starts_at)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-semibold text-foreground">
                      <User className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="truncate">{name === "—" ? "Paciente não identificado" : name}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground/90">{chair}</span>
                      {infusion ? (
                        <>
                          {" · "}
                          <span className="text-foreground/80">{infusion}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground"> · Infusão não descrita</span>
                      )}
                    </p>
                  </div>
                  <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-center text-[0.65rem] text-muted-foreground">
        Horários por reserva · toque para abrir o recurso
      </p>
    </Card>
  );
}
