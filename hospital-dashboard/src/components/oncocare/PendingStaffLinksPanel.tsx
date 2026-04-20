import { Clock, Hospital } from "lucide-react";
import type { PendingStaffLinkRequest } from "@/types/dashboard";
import { formatPatientCodeDisplay } from "@/lib/patientCode";
import { cn } from "@/lib/utils";

type Props = {
  items: PendingStaffLinkRequest[];
  hospitalNameById: Map<string, string>;
  className?: string;
};

/**
 * Lista pedidos de vínculo criados pelo staff que ainda não foram aprovados pelo paciente no app.
 */
export function PendingStaffLinksPanel({ items, hospitalNameById, className }: Props) {
  if (items.length === 0) return null;
  const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className={cn("rounded-2xl border border-sky-200 bg-sky-50/90 p-4 shadow-sm", className)}>
      <div className="flex items-start gap-3">
        <Clock className="mt-0.5 size-5 shrink-0 text-sky-700" strokeWidth={2} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-sky-950">Pedidos enviados — aguardam o paciente</p>
          <p className="mt-1 text-xs leading-relaxed text-sky-900/85">
            Estes vínculos só entram na fila e no dossiê depois de aprovados em Aura → Autorizações. Enquanto estiverem
            pendentes, não é possível enviar outro pedido para o mesmo código e hospital.
          </p>
          <ul className="mt-3 space-y-2" aria-label="Lista de pedidos pendentes">
            {items.map((x) => (
              <li
                key={x.id}
                className="flex flex-col gap-1 rounded-xl border border-sky-100 bg-white/95 px-3 py-2.5 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2"
              >
                <span className="font-mono text-sm font-semibold text-slate-900">
                  {(formatPatientCodeDisplay(x.patient_code) ?? x.patient_code) || "—"}
                </span>
                <span className="text-slate-700">
                  {x.patient_name ? <span className="font-medium">{x.patient_name}</span> : <span className="text-muted-foreground">Nome oculto</span>}
                </span>
                {hospitalNameById.size > 1 ? (
                  <span className="inline-flex items-center gap-1 text-[0.7rem] text-muted-foreground">
                    <Hospital className="size-3.5 shrink-0" aria-hidden />
                    {hospitalNameById.get(x.hospital_id) ?? "—"}
                  </span>
                ) : null}
                <span className="text-[0.7rem] text-sky-900/90 sm:ml-auto">Pedido em {fmt.format(new Date(x.requested_at))}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
