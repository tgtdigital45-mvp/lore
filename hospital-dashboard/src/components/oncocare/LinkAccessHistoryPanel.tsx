import { useCallback, useEffect, useState } from "react";
import { History } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    void load();
  }, [load]);

  if (!hospitalIds.length) return null;

  return (
    <Card className={cn("rounded-3xl border border-[#E8EAED] bg-white p-5 shadow-sm", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="size-5 text-[#6366F1]" strokeWidth={2} />
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Histórico de autorizações</h3>
            <p className="mt-1 max-w-xl text-xs text-muted-foreground">
              Pedidos, aprovações, recusas e revogações nos seus hospitais.
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" className="rounded-xl" disabled={loading} onClick={() => void load()}>
          {loading ? "A carregar…" : "Atualizar"}
        </Button>
      </div>

      {err ? (
        <p className="mt-4 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]" role="alert">
          {err}
        </p>
      ) : null}

      {!err && !loading && rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Ainda não há eventos registados.</p>
      ) : null}

      {rows.length > 0 ? (
        <ul className="mt-4 max-h-[min(24rem,50vh)] space-y-2 overflow-y-auto pr-1 text-sm">
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
    </Card>
  );
}
