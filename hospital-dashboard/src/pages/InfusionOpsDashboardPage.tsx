import { useMemo } from "react";
import { Armchair, Loader2 } from "lucide-react";
import { useInfusionAgenda, type InfusionResourceRow, type InfusionBookingRow } from "@/hooks/useInfusionAgenda";
import { Card } from "@/components/ui/card";
import { formatPtDateTime } from "@/lib/dashboardFormat";

function patientName(b: InfusionBookingRow): string {
  const p = b.patients;
  if (!p) return "—";
  const prof = Array.isArray(p) ? p[0]?.profiles : p.profiles;
  const fn = Array.isArray(prof) ? prof[0]?.full_name : prof?.full_name;
  return fn?.trim() || "—";
}

function statusForChair(
  chair: InfusionResourceRow,
  now: number,
  bookings: InfusionBookingRow[]
): { label: string; className: string } {
  if (chair.operational_status === "maintenance") {
    return { label: "Manutenção", className: "bg-slate-200 text-slate-800" };
  }
  const here = bookings.filter((b) => b.resource_id === chair.id);
  const active = here.find((b) => {
    const s = new Date(b.starts_at).getTime();
    const e = new Date(b.ends_at).getTime();
    return now >= s && now <= e;
  });
  if (active) return { label: "Em uso", className: "bg-sky-500 text-white" };
  const soon = here.find((b) => {
    const s = new Date(b.starts_at).getTime();
    return s > now && s - now < 6 * 3600 * 1000;
  });
  if (soon) return { label: "Reservada", className: "bg-amber-100 text-amber-950" };
  return { label: "Disponível", className: "bg-emerald-100 text-emerald-900" };
}

export function InfusionOpsDashboardPage() {
  const { resources, bookings, loading, error, hospitalId } = useInfusionAgenda();
  const now = Date.now();
  const horizon = now + 6 * 3600 * 1000;

  const upcoming = useMemo(() => {
    return bookings.filter((b) => {
      const s = new Date(b.starts_at).getTime();
      return s >= now && s <= horizon;
    });
  }, [bookings, now, horizon]);

  if (loading && !hospitalId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        A carregar cadeiras…
      </div>
    );
  }

  if (error) {
    return <p className="p-8 text-destructive">{error}</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Painel operacional — infusão</h1>
        <p className="text-sm text-muted-foreground">Estado das cadeiras e marcações nas próximas 6 horas.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resources.map((c) => {
          const st = statusForChair(c, now, bookings);
          return (
            <Card key={c.id} className="rounded-3xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold">
                  <Armchair className="size-5 text-teal-600" />
                  <span className="truncate">{c.label}</span>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold uppercase ${st.className}`}>{st.label}</span>
              </div>
              <p className="text-[0.65rem] uppercase text-muted-foreground">{c.kind === "chair" ? "Cadeira" : "Maca"}</p>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-3xl border border-slate-200/80 p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">Próximas sessões (6h)</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem marcações nesta janela.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm">
                <span className="font-semibold">{patientName(b)}</span>
                <span className="text-muted-foreground">
                  {formatPtDateTime(b.starts_at)} → {formatPtDateTime(b.ends_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
