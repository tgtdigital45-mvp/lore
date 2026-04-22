import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { sanitizeSupabaseError } from "@/lib/errorMessages";
import type { AuditLogRow } from "@/types/dashboard";
import { ScrollArea } from "@/components/ui/scroll-area";

function formatTs(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function metaIp(meta: Record<string, unknown>): string {
  const ip = meta.ip ?? meta.client_ip ?? meta.ip_address;
  return typeof ip === "string" ? ip : "—";
}

export function AuditLogList() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.rpc("staff_audit_logs_list", { p_limit: 120 });
    if (err) {
      setError(sanitizeSupabaseError(err));
      setRows([]);
    } else {
      setRows((data ?? []) as AuditLogRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground" role="status">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        A carregar trilha de auditoria…
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhum registo de auditoria com paciente ligado à sua lotação.</p>;
  }

  return (
    <ScrollArea className="h-[min(420px,55vh)] rounded-2xl border border-[#E8ECF1]">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-[#FAFBFC] text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Quando</th>
            <th className="px-4 py-3">Ação</th>
            <th className="px-4 py-3">Profissional</th>
            <th className="px-4 py-3">Paciente</th>
            <th className="px-4 py-3">IP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-[#F3F4F6] hover:bg-slate-50/80">
              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-600">{formatTs(r.ts)}</td>
              <td className="px-4 py-2.5 text-xs font-medium text-slate-800">{r.action_type}</td>
              <td className="max-w-[140px] truncate px-4 py-2.5 text-xs">{r.actor_name || "—"}</td>
              <td className="max-w-[160px] truncate px-4 py-2.5 text-xs">{r.patient_name || "—"}</td>
              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[0.7rem] text-muted-foreground">
                {metaIp(r.metadata ?? {})}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
}
