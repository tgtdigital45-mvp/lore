import { useCallback, useEffect, useId, useState } from "react";
import { History, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingInline } from "@/components/ui/LoadingInline";
import { cn } from "@/lib/utils";
import { sanitizeSupabaseError } from "@/lib/errorMessages";
import { formatPatientCodeDisplay } from "@/lib/patientCode";

export type LinkAccessEventRow = {
  id: string;
  event_type: string;
  prior_status: string | null;
  new_status: string;
  created_at: string;
  access_valid_until: string | null;
  patient_code: string | null;
  hospital_id: string;
};

const EVENT_LABEL: Record<string, string> = {
  created: "Pedido criado",
  reopened: "Novo pedido (reaberto)",
  approved: "Paciente aprovou",
  rejected: "Paciente recusou",
  revoked: "Acesso revogado",
  status_changed: "Estado alterado",
};

type Props = {
  hospitalIds: string[];
  hospitalNameById: Map<string, string>;
  className?: string;
};

export function LinkAccessHistoryPanel({ hospitalIds, hospitalNameById, className }: Props) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<LinkAccessEventRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!hospitalIds.length) {
      setRows([]);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("patient_hospital_link_events")
        .select("id, event_type, prior_status, new_status, created_at, access_valid_until, patient_code, hospital_id")
        .in("hospital_id", hospitalIds)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        setErr(sanitizeSupabaseError(error));
        setRows([]);
        return;
      }
      setRows((data ?? []) as LinkAccessEventRow[]);
    } finally {
      setLoading(false);
    }
  }, [hospitalIds]);

  useEffect(() => {
    if (!open || !hospitalIds.length) return;
    void load();
  }, [open, hospitalIds.length, load]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!hospitalIds.length) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "h-11 w-full justify-center gap-2 rounded-2xl border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 sm:w-auto",
          className
        )}
        onClick={() => setOpen(true)}
      >
        <History className="size-5 shrink-0 text-[#6366F1]" strokeWidth={2} aria-hidden />
        Histórico de autorizações
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <Card
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col rounded-t-3xl border border-slate-200/90 bg-white shadow-2xl sm:max-h-[min(85vh,36rem)] sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5 pb-4">
              <div className="flex min-w-0 items-start gap-3 pr-2">
                <History className="mt-0.5 size-5 shrink-0 text-[#6366F1]" strokeWidth={2} aria-hidden />
                <div className="min-w-0">
                  <h3 id={titleId} className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                    Histórico de autorizações
                  </h3>
                  <p className="mt-1 max-w-xl text-xs text-muted-foreground">
                    Pedidos, aprovações, recusas e revogações nos seus hospitais.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button type="button" variant="outline" size="sm" className="rounded-xl" disabled={loading} onClick={() => void load()}>
                  {loading ? "A carregar…" : "Atualizar"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0 rounded-xl text-slate-600"
                  onClick={() => setOpen(false)}
                  aria-label="Fechar"
                >
                  <X className="size-5" />
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4">
              {loading && rows.length === 0 && !err ? (
                <div className="flex justify-center py-10">
                  <LoadingInline>A carregar eventos…</LoadingInline>
                </div>
              ) : null}

              {err ? (
                <p className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]" role="alert">
                  {err}
                </p>
              ) : null}

              {!err && !loading && rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda não há eventos registados.</p>
              ) : null}

              {rows.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {rows.map((r) => {
                    const hname = hospitalNameById.get(r.hospital_id) ?? "Hospital";
                    const codeDisp = r.patient_code ? formatPatientCodeDisplay(r.patient_code) ?? r.patient_code : "—";
                    const when = new Date(r.created_at).toLocaleString("pt-BR");
                    const until = r.access_valid_until ? new Date(r.access_valid_until).toLocaleDateString("pt-BR") : null;
                    return (
                      <li
                        key={r.id}
                        className="rounded-2xl border border-[#F3F4F6] bg-[#FAFAFA] px-3 py-2.5 text-[0.8rem] leading-snug text-foreground"
                      >
                        <span className="font-semibold">{EVENT_LABEL[r.event_type] ?? r.event_type}</span>
                        <span className="text-muted-foreground"> · {hname}</span>
                        <div className="mt-0.5 font-mono text-xs text-slate-600">{codeDisp}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {when}
                          {r.prior_status ? ` · de “${r.prior_status}” → “${r.new_status}”` : ` · estado: ${r.new_status}`}
                          {until ? ` · validade indicada: ${until}` : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}
