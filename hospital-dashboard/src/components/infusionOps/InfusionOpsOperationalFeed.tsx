import { AlertTriangle, Bell, Info, ShieldCheck } from "lucide-react";
import type { OperationalFeedItem } from "@/lib/infusionOpsShared";
import { cn } from "@/lib/utils";

const variantStyles: Record<
  OperationalFeedItem["variant"],
  { box: string; icon: string; title: string }
> = {
  danger: {
    box: "border-rose-200/90 bg-gradient-to-br from-rose-50 to-white text-rose-950 shadow-sm ring-1 ring-rose-100/80",
    icon: "text-rose-600",
    title: "text-rose-900",
  },
  warn: {
    box: "border-amber-200/90 bg-gradient-to-br from-amber-50 to-white text-amber-950 shadow-sm ring-1 ring-amber-100/80",
    icon: "text-amber-600",
    title: "text-amber-950",
  },
  info: {
    box: "border-slate-200/90 bg-gradient-to-br from-slate-50 to-white text-slate-800 shadow-sm ring-1 ring-slate-100/90",
    icon: "text-slate-500",
    title: "text-slate-900",
  },
};

function FeedIcon({ variant }: { variant: OperationalFeedItem["variant"] }) {
  if (variant === "danger") return <AlertTriangle className="size-5 shrink-0" aria-hidden />;
  if (variant === "warn") return <Bell className="size-5 shrink-0" aria-hidden />;
  return <Info className="size-5 shrink-0" aria-hidden />;
}

function FeedList({
  items,
  emptyLabel,
  size,
}: {
  items: OperationalFeedItem[];
  emptyLabel: string;
  size: "desk" | "display";
}) {
  const isDisplay = size === "display";
  if (items.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border border-dashed border-slate-200/90 bg-white/60 px-4 py-4 text-slate-500",
          isDisplay ? "text-lg" : "text-sm"
        )}
      >
        <ShieldCheck className="size-5 shrink-0 text-emerald-600" aria-hidden />
        {emptyLabel}
      </div>
    );
  }
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const vs = variantStyles[item.variant];
        return (
          <li
            key={item.id}
            className={cn(
              "flex gap-3 rounded-2xl border px-4 py-3.5",
              vs.box,
              isDisplay ? "px-5 py-4" : ""
            )}
          >
            <span className={cn("mt-0.5", vs.icon)}>
              <FeedIcon variant={item.variant} />
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("font-bold", vs.title, isDisplay ? "text-lg" : "text-sm")}>{item.title}</p>
              <p className={cn("mt-1 text-pretty leading-snug text-slate-600", isDisplay ? "text-base" : "text-sm")}>
                {item.body}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

type Props = {
  alerts: OperationalFeedItem[];
  notices: OperationalFeedItem[];
  size: "desk" | "display";
};

export function InfusionOpsOperationalFeed({ alerts, notices, size }: Props) {
  const isDisplay = size === "display";
  return (
    <section className="space-y-6" aria-label="Alertas e avisos operacionais">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-teal-700/80">Sala de infusão</p>
          <h2 className={cn("font-black tracking-tight text-slate-900", isDisplay ? "text-2xl md:text-3xl" : "text-xl")}>
            Alertas e avisos
          </h2>
          <p className={cn("mt-1 max-w-xl text-slate-600", isDisplay ? "text-base" : "text-sm")}>
            Priorização automática com base na agenda, nos postos e na janela de 6 horas.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
            <AlertTriangle className="size-4 text-amber-600" aria-hidden />
            Alertas
          </h3>
          <FeedList
            items={alerts}
            emptyLabel="Nenhum alerta crítico neste momento."
            size={size}
          />
        </div>
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
            <Info className="size-4 text-slate-500" aria-hidden />
            Avisos
          </h3>
          <FeedList
            items={notices}
            emptyLabel="Sem avisos informativos adicionais."
            size={size}
          />
        </div>
      </div>
    </section>
  );
}
