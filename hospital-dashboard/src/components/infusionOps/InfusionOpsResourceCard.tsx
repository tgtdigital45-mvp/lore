import { Armchair, BedDouble, Clock3, UserRound } from "lucide-react";
import type { InfusionBookingRow, InfusionResourceRow } from "@/hooks/useInfusionAgenda";
import { formatPtDateTime } from "@/lib/dashboardFormat";
import { infusionPatientName, nextScheduledBooking, statusForChair } from "@/lib/infusionOpsShared";
import { cn } from "@/lib/utils";

type Props = {
  chair: InfusionResourceRow;
  bookings: InfusionBookingRow[];
  nowMs: number;
  variant: "desk" | "display";
};

export function InfusionOpsResourceCard({ chair, bookings, nowMs, variant }: Props) {
  const st = statusForChair(chair, nowMs, bookings);
  const next = chair.operational_status === "maintenance" ? null : nextScheduledBooking(chair.id, nowMs, bookings);
  const isDisplay = variant === "display";

  const Icon = chair.kind === "chair" ? Armchair : BedDouble;

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl border bg-white/95 shadow-[0_8px_30px_rgb(15,23,42,0.06)] transition-[box-shadow,transform] duration-300 hover:shadow-[0_12px_40px_rgb(15,23,42,0.1)]",
        "border-slate-200/90 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-teal-500 before:via-cyan-500 before:to-teal-400",
        isDisplay ? "p-6 md:min-h-[14rem] md:p-7" : "p-5"
      )}
    >
      {chair.paxman_cryotherapy ? (
        <span className="absolute right-4 top-4 rounded-full bg-violet-100 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-violet-800 ring-1 ring-violet-200/80">
          PAXMAN
        </span>
      ) : null}

      <div className={cn("mb-4 flex items-start justify-between gap-3", chair.paxman_cryotherapy && "pr-14")}>
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/15 to-cyan-600/10 text-teal-700 ring-1 ring-teal-500/20",
              isDisplay ? "size-14" : "size-11"
            )}
          >
            <Icon className={isDisplay ? "size-7" : "size-5"} aria-hidden />
          </div>
          <div className="min-w-0">
            <h3
              className={cn(
                "truncate font-black tracking-tight text-slate-900",
                isDisplay ? "text-xl md:text-2xl" : "text-lg"
              )}
            >
              {chair.label}
            </h3>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-slate-400">
              {chair.kind === "chair" ? "Cadeira" : "Maca"}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-center text-[0.65rem] font-bold uppercase tracking-wide",
            st.className,
            isDisplay && "px-3 py-1.5 text-xs md:text-sm"
          )}
        >
          {st.label}
        </span>
      </div>

      {st.activePatient ? (
        <div className="mb-4 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/90 to-white px-4 py-3 ring-1 ring-sky-100/60">
          <p className="mb-1 flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-sky-700/90">
            <UserRound className="size-3.5" aria-hidden />
            Em sessão
          </p>
          <p className={cn("truncate font-bold text-slate-900", isDisplay ? "text-lg md:text-xl" : "text-base")}>{st.activePatient}</p>
        </div>
      ) : null}

      <div className="mt-auto rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 ring-1 ring-slate-100/80">
        <p className="mb-1.5 flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">
          <Clock3 className="size-3.5 text-slate-400" aria-hidden />
          Próximo agendado
        </p>
        {next ? (
          <>
            <p className={cn("truncate font-bold text-slate-900", isDisplay ? "text-base md:text-lg" : "text-sm")}>
              {infusionPatientName(next)}
            </p>
            <p className={cn("mt-1 font-medium text-slate-600", isDisplay ? "text-sm md:text-base" : "text-xs")}>
              {formatPtDateTime(next.starts_at)}
            </p>
          </>
        ) : (
          <p className={cn("font-medium text-slate-500", isDisplay ? "text-base" : "text-sm")}>
            {chair.operational_status === "maintenance"
              ? "Indisponível neste posto."
              : "Sem marcações futuras na janela carregada."}
          </p>
        )}
      </div>
    </div>
  );
}
