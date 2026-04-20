import { useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import type { MedicationRow, TreatmentCycleRow, TreatmentInfusionRow } from "@/types/dashboard";
import { CYCLE_STATUS_PT, TREATMENT_KIND_PT } from "@/constants/dashboardLabels";
import { formatPtDateLong, formatPtDateTime } from "@/lib/dashboardFormat";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { sanitizeSupabaseError } from "@/lib/errorMessages";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const INFUSION_STATUS_PT: Record<string, string> = {
  completed: "Concluída",
  scheduled: "Agendada",
  cancelled: "Cancelada",
  missed: "Não realizada",
};

function sessionAtToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseWeightKg(v: unknown): string {
  if (v == null) return "";
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? String(n) : "";
}

function medLabel(m: MedicationRow): string {
  return m.display_name?.trim() || m.name;
}

type Props = {
  loading: boolean;
  cycles: TreatmentCycleRow[];
  infusions: TreatmentInfusionRow[];
  medications: MedicationRow[];
  onUpdated?: () => Promise<void> | void;
};

export default function PatientTratamentoPanel({ loading, cycles, infusions, medications, onUpdated }: Props) {
  const sortedCycles = [...cycles].sort((a, b) => b.start_date.localeCompare(a.start_date));
  const sortedInfusions = [...infusions].sort(
    (a, b) => new Date(b.session_at).getTime() - new Date(a.session_at).getTime()
  );
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState("active");
  const [editPlanned, setEditPlanned] = useState("");
  const [editCompleted, setEditCompleted] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);

  const [editingInfusionId, setEditingInfusionId] = useState<string | null>(null);
  const [infSessionLocal, setInfSessionLocal] = useState("");
  const [infWeight, setInfWeight] = useState("");
  const [infObs, setInfObs] = useState("");
  const [saveInfBusy, setSaveInfBusy] = useState(false);

  function startInfusionEdit(row: TreatmentInfusionRow): void {
    setEditingInfusionId(row.id);
    setInfSessionLocal(sessionAtToDatetimeLocal(row.session_at));
    setInfWeight(parseWeightKg(row.weight_kg));
    setInfObs(row.notes ?? "");
  }

  async function saveInfusionEdit(infusionId: string): Promise<void> {
    if (!infSessionLocal.trim()) return;
    const t = new Date(infSessionLocal);
    if (Number.isNaN(t.getTime())) return;
    const wTrim = infWeight.trim();
    let weight_kg: number | null = null;
    if (wTrim !== "") {
      const w = Number(wTrim.replace(",", "."));
      if (!Number.isFinite(w) || w <= 0 || w >= 500) {
        window.alert("Peso deve estar entre 0 e 500 kg (ou vazio).");
        return;
      }
      weight_kg = w;
    }
    setSaveInfBusy(true);
    try {
      const { error } = await supabase
        .from("treatment_infusions")
        .update({
          session_at: t.toISOString(),
          weight_kg,
          notes: infObs.trim() || null,
        })
        .eq("id", infusionId);
      if (error) throw error;
      setEditingInfusionId(null);
      await onUpdated?.();
      toast.success("Infusão atualizada.");
    } catch (err) {
      console.error(err);
      toast.error(sanitizeSupabaseError(err as { code?: string; message?: string }));
    } finally {
      setSaveInfBusy(false);
    }
  }

  function startEdit(cycle: TreatmentCycleRow): void {
    setEditingCycleId(cycle.id);
    setEditStatus(cycle.status);
    setEditPlanned(cycle.planned_sessions != null ? String(cycle.planned_sessions) : "");
    setEditCompleted(cycle.completed_sessions != null ? String(cycle.completed_sessions) : "");
    setEditNotes(cycle.notes ?? "");
  }

  async function saveEdit(cycleId: string): Promise<void> {
    const planned = editPlanned.trim() === "" ? null : Number(editPlanned);
    const completed = editCompleted.trim() === "" ? null : Number(editCompleted);
    if ((planned != null && !Number.isFinite(planned)) || (completed != null && !Number.isFinite(completed))) return;
    setSaveBusy(true);
    try {
      const { error } = await supabase
        .from("treatment_cycles")
        .update({
          status: editStatus,
          planned_sessions: planned,
          completed_sessions: completed,
          notes: editNotes.trim() || null,
        })
        .eq("id", cycleId);
      if (error) throw error;
      setEditingCycleId(null);
      await onUpdated?.();
      toast.success("Ciclo de tratamento atualizado.");
    } catch (err) {
      console.error(err);
      toast.error(sanitizeSupabaseError(err as { code?: string; message?: string }));
    } finally {
      setSaveBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-24 animate-pulse rounded-2xl bg-[#F1F5F9]" />
        <div className="h-40 animate-pulse rounded-2xl bg-[#F1F5F9]" />
      </div>
    );
  }

  return (
    <div className="space-y-10 font-sans">
      <section>
        <h2 className="mb-2 text-lg font-bold text-foreground">Ciclos de tratamento</h2>
        <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
          Sessões e registos de ciclo. Os medicamentos na app são listados abaixo (não estão ligados a um ciclo específico neste registo).
        </p>
        {sortedCycles.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#E2E8F0] bg-[#FAFBFC] px-6 py-10 text-center text-sm text-muted-foreground">
            Nenhum ciclo cadastrado.
          </p>
        ) : (
          <ul className="space-y-3">
            {sortedCycles.map((c) => (
              <li
                key={c.id}
                className={cn(
                  "rounded-2xl border bg-white px-4 py-4 shadow-sm",
                  c.status === "active" ? "border-lime-300/80 ring-1 ring-lime-200" : "border-slate-200"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{c.protocol_name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {TREATMENT_KIND_PT[c.treatment_kind ?? "other"] ?? c.treatment_kind ?? "—"} ·{" "}
                      {CYCLE_STATUS_PT[c.status] ?? c.status}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Início: {formatPtDateLong(c.start_date)}
                      {c.end_date ? ` · Fim: ${formatPtDateLong(c.end_date)}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sessões: {c.completed_sessions ?? 0} / {c.planned_sessions ?? "—"}
                      {c.infusion_interval_days ? ` · Intervalo: ${c.infusion_interval_days} dia(s)` : ""}
                    </p>
                    {c.last_session_at ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Última sessão (ciclo): {formatPtDateTime(c.last_session_at)}
                      </p>
                    ) : null}
                    {editingCycleId === c.id ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="h-10 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm"
                        >
                          <option value="active">Ativo</option>
                          <option value="completed">Concluído</option>
                          <option value="on_hold">Suspenso</option>
                        </select>
                        <Input
                          value={editPlanned}
                          onChange={(e) => setEditPlanned(e.target.value)}
                          placeholder="Sessões planejadas"
                          type="number"
                          className="rounded-xl"
                        />
                        <Input
                          value={editCompleted}
                          onChange={(e) => setEditCompleted(e.target.value)}
                          placeholder="Sessões concluídas"
                          type="number"
                          className="rounded-xl"
                        />
                        <Input
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Notas do ciclo"
                          className="rounded-xl sm:col-span-2"
                        />
                        <div className="flex gap-2 sm:col-span-2">
                          <Button type="button" size="sm" className="rounded-xl" disabled={saveBusy} onClick={() => void saveEdit(c.id)}>
                            Guardar
                          </Button>
                          <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={() => setEditingCycleId(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : c.notes?.trim() ? (
                      <p className="mt-2 rounded-xl bg-[#F8FAFC] px-3 py-2 text-xs text-muted-foreground">{c.notes.trim()}</p>
                    ) : null}
                  </div>
                  <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => startEdit(c)}>
                    Editar ciclo
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-foreground">Histórico de infusões</h2>
        {sortedInfusions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#E2E8F0] bg-[#FAFBFC] px-6 py-10 text-center text-sm text-muted-foreground">
            Nenhuma infusão registrada.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#E8EAED] bg-white">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC] text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-3">Tipo</th>
                  <th className="px-3 py-3">Data / hora</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-3 py-3">Peso (kg)</th>
                  <th className="min-w-[140px] px-3 py-3">Observação</th>
                  <th className="px-3 py-3">Ciclo</th>
                  <th className="w-24 px-3 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedInfusions.map((row) => {
                  const cycle = sortedCycles.find((c) => c.id === row.cycle_id);
                  const kindKey = cycle?.treatment_kind ?? "other";
                  const tipoLabel = TREATMENT_KIND_PT[kindKey] ?? kindKey;
                  const isEditing = editingInfusionId === row.id;
                  return (
                    <tr key={row.id} className="border-b border-[#F1F5F9] align-top last:border-0">
                      <td className="px-3 py-2.5 text-muted-foreground">{tipoLabel}</td>
                      <td className="px-3 py-2.5">
                        {isEditing ? (
                          <Input
                            type="datetime-local"
                            value={infSessionLocal}
                            onChange={(e) => setInfSessionLocal(e.target.value)}
                            className="h-9 min-w-[11rem] rounded-lg text-xs"
                          />
                        ) : (
                          <span className="whitespace-nowrap text-muted-foreground">{formatPtDateTime(row.session_at)}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">{INFUSION_STATUS_PT[row.status] ?? row.status}</td>
                      <td className="px-3 py-2.5">
                        {isEditing ? (
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={infWeight}
                            onChange={(e) => setInfWeight(e.target.value)}
                            placeholder="—"
                            className="h-9 w-24 rounded-lg text-xs"
                          />
                        ) : (
                          <span className="text-muted-foreground">{parseWeightKg(row.weight_kg) || "—"}</span>
                        )}
                      </td>
                      <td className="max-w-[220px] px-3 py-2.5">
                        {isEditing ? (
                          <textarea
                            value={infObs}
                            onChange={(e) => setInfObs(e.target.value)}
                            rows={2}
                            placeholder="Ex.: fármaco usado na infusão"
                            className="w-full rounded-lg border border-[#E2E8F0] bg-white px-2 py-1.5 text-xs"
                          />
                        ) : (
                          <span className="line-clamp-3 text-xs text-muted-foreground">{row.notes?.trim() || "—"}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{row.cycle_id.slice(0, 8)}…</td>
                      <td className="px-3 py-2.5 text-right">
                        {isEditing ? (
                          <div className="flex flex-col items-end gap-1">
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 rounded-lg px-2 text-xs"
                              disabled={saveInfBusy}
                              onClick={() => void saveInfusionEdit(row.id)}
                            >
                              Guardar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 rounded-lg px-2 text-xs"
                              onClick={() => setEditingInfusionId(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8 rounded-lg"
                            onClick={() => startInfusionEdit(row)}
                            aria-label="Editar infusão"
                          >
                            <Pencil className="size-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold text-foreground">Medicação na app Aura</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Medicamentos que o paciente cadastrou. Não há associação a ciclo na base de dados atual.
        </p>
        {medications.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#E2E8F0] bg-[#FAFBFC] px-6 py-10 text-center text-sm text-muted-foreground">
            Nenhum medicamento cadastrado na app.
          </p>
        ) : (
          <ul className="space-y-2">
            {medications.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E8EAED] bg-white px-4 py-3 text-sm"
              >
                <span className="font-medium">{medLabel(m)}</span>
                <span className="text-muted-foreground">
                  {[m.dosage, m.form].filter(Boolean).join(" · ") || "—"}
                </span>
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs font-semibold",
                    m.active ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#F1F5F9] text-muted-foreground"
                  )}
                >
                  {m.active ? "Ativo" : "Inativo"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
