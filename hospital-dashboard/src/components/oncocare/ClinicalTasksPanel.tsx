import { ClipboardList } from "lucide-react";
import { useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { formatPtDateTime } from "@/lib/dashboardFormat";
import { profileName } from "@/lib/dashboardProfile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ClinicalTaskRow } from "@/types/dashboard";

type Props = {
  tasks: ClinicalTaskRow[];
  loading: boolean;
  onRefresh: () => void;
};

export function ClinicalTasksPanel({ tasks, loading, onRefresh }: Props) {
  const sorted = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        const ta = a.triage_semaphore === "red" ? 0 : 1;
        const tb = b.triage_semaphore === "red" ? 0 : 1;
        return ta - tb || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [tasks]
  );

  return (
    <Card className="rounded-3xl border border-[#E8EAED] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          <ClipboardList className="size-4" />
          Tarefas clínicas
        </h3>
        <button type="button" className="text-xs font-semibold text-[#6366F1] underline" onClick={() => onRefresh()}>
          Atualizar
        </button>
      </div>
      {loading ? <p className="mt-3 text-sm text-muted-foreground">Carregando…</p> : null}
      {!loading && sorted.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Sem tarefas abertas (triagem amarela/vermelha gera automaticamente).</p>
      ) : null}
      <ul className="mt-3 flex flex-col gap-2">
        {sorted.slice(0, 12).map((t) => {
          const p = t.patients;
          const prof = p?.profiles;
          const name = profileName(prof ?? null);
          return (
            <li
              key={t.id}
              className="flex flex-col gap-1 rounded-2xl border border-[#F1F5F9] bg-[#FAFBFC] px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-md px-2 py-0.5 text-[0.65rem] font-bold uppercase ${
                    t.triage_semaphore === "red" ? "bg-[#FEF2F2] text-[#B91C1C]" : "bg-[#FFFBEB] text-[#B45309]"
                  }`}
                >
                  {t.triage_semaphore === "red" ? "Vermelho" : "Amarelo"}
                </span>
                <span className="font-semibold">{name || "Paciente"}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t.title}</p>
              <p className="text-[0.65rem] text-muted-foreground">{formatPtDateTime(t.created_at)}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-xl px-3 text-xs font-semibold"
                  onClick={() => {
                    void (async () => {
                      const { data: auth } = await supabase.auth.getUser();
                      const uid = auth.user?.id;
                      if (!uid) return;
                      await supabase.from("clinical_tasks").update({ status: "in_progress", assigned_to: uid }).eq("id", t.id);
                      onRefresh();
                    })();
                  }}
                >
                  Atribuir a mim
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 rounded-xl px-3 text-xs font-semibold text-muted-foreground"
                  onClick={() => {
                    void (async () => {
                      await supabase.from("clinical_tasks").update({ status: "done" }).eq("id", t.id);
                      onRefresh();
                    })();
                  }}
                >
                  Concluir
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
