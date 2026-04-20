import { CheckCircle2, Circle, Play } from "lucide-react";
import type { ClinicalTaskRow } from "@/types/dashboard";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatPtDateTime } from "@/lib/dashboardFormat";
import { ClinicalEmptyState } from "@/components/patient/ClinicalEmptyState";
import { sanitizeSupabaseError } from "@/lib/errorMessages";
import { toast } from "sonner";
type Props = {
  tasks: ClinicalTaskRow[];
  onRefresh: () => void;
};

const COLS: { id: ClinicalTaskRow["status"]; label: string }[] = [
  { id: "open", label: "Aberta" },
  { id: "in_progress", label: "Em andamento" },
  { id: "done", label: "Concluída" },
];

function taskTitle(t: ClinicalTaskRow): string {
  return t.title;
}

export function PatientTasksPanel({ tasks, onRefresh }: Props) {
  async function setStatus(id: string, status: "open" | "in_progress" | "done" | "cancelled") {
    try {
      const { error } = await supabase.from("clinical_tasks").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      onRefresh();
      toast.success("Tarefa atualizada.");
    } catch (e) {
      toast.error(sanitizeSupabaseError(e as { message?: string }));
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {COLS.map((col) => (
        <Card key={col.id} className="rounded-3xl border border-white/55 bg-white/45 p-3 shadow-sm backdrop-blur-sm">
          <h3 className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-muted-foreground">{col.label}</h3>
          <ul className="space-y-2">
            {tasks.filter((t) => t.status === col.id).length === 0 ? (
              <li className="text-center text-[0.7rem] text-muted-foreground">—</li>
            ) : (
              tasks
                .filter((t) => t.status === col.id)
                .map((t) => (
                  <li key={t.id} className="rounded-2xl border border-slate-100 bg-white/80 px-3 py-2 text-sm shadow-sm">
                    <p className="font-semibold leading-snug text-slate-900">{taskTitle(t)}</p>
                    <p className="text-[0.65rem] text-muted-foreground">{formatPtDateTime(t.created_at)}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {col.id !== "open" ? (
                        <Button size="sm" variant="outline" className="h-7 rounded-lg text-[0.65rem]" onClick={() => void setStatus(t.id, "open")}>
                          Reabrir
                        </Button>
                      ) : null}
                      {col.id === "open" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-lg text-[0.65rem]"
                          onClick={() => void setStatus(t.id, "in_progress")}
                        >
                          <Play className="mr-1 size-3" />
                          Iniciar
                        </Button>
                      ) : null}
                      {col.id === "in_progress" ? (
                        <Button
                          size="sm"
                          className="h-7 rounded-lg text-[0.65rem]"
                          onClick={() => void setStatus(t.id, "done")}
                        >
                          <CheckCircle2 className="mr-1 size-3" />
                          Concluir
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))
            )}
          </ul>
        </Card>
      ))}
      {tasks.length === 0 ? (
        <div className="md:col-span-3">
          <ClinicalEmptyState
            icon={Circle}
            title="Sem tarefas clínicas"
            description="Tarefas são criadas automaticamente a partir de sintomas com triagem amarela/vermelha."
          />
        </div>
      ) : null}
    </div>
  );
}
