import { useEffect, useState } from "react";
import type { MedicationRow, TreatmentCycleRow, TreatmentInfusionRow } from "@/types/dashboard";
import { CYCLE_STATUS_PT, TREATMENT_KIND_PT } from "@/constants/dashboardLabels";
import { formatPtDateLong, formatPtDateTime } from "@/lib/dashboardFormat";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const INFUSION_STATUS_PT: Record<string, string> = {
  completed: "Concluída",
  scheduled: "Agendada",
  cancelled: "Cancelada",
  missed: "Não realizada",
};

function medLabel(m: MedicationRow): string {
  return m.display_name?.trim() || m.name;
}

type Props = {
  loading: boolean;
  cycles: TreatmentCycleRow[];
  infusions: TreatmentInfusionRow[];
  medications: MedicationRow[];
  patientId: string;
  cancerTypeId: string | null;
  primaryCancerType: string;
  onUpdated?: () => Promise<void> | void;
};

export default function PatientTratamentoPanel({
  loading,
  cycles,
  infusions,
  medications,
  patientId: _patientId,
  cancerTypeId,
  primaryCancerType,
  onUpdated,
}: Props) {
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
  const [resolvedCancerTypeId, setResolvedCancerTypeId] = useState<string | null>(cancerTypeId);
  const [protocolOptions, setProtocolOptions] = useState<{ id: string; name: string }[]>([]);
  const [draftProtocol, setDraftProtocol] = useState<Record<string, string>>({});
  const [protocolSavingId, setProtocolSavingId] = useState<string | null>(null);

  useEffect(() => {
    setResolvedCancerTypeId(cancerTypeId);
  }, [cancerTypeId]);

  useEffect(() => {
    if (cancerTypeId) return;
    void (async () => {
      const { data } = await supabase.from("cancer_types").select("id").eq("legacy_cancer_type", primaryCancerType).maybeSingle();
      setResolvedCancerTypeId(data?.id ?? null);
    })();
  }, [cancerTypeId, primaryCancerType]);

  useEffect(() => {
    if (!resolvedCancerTypeId) {
      setProtocolOptions([]);
      return;
    }
    void (async () => {
      const { data, error } = await supabase
        .from("cancer_protocols")
        .select("protocol_id, protocols ( id, name )")
        .eq("cancer_type_id", resolvedCancerTypeId);
      if (error) {
        console.warn("[PatientTratamentoPanel] protocols", error.message);
        return;
      }
      const opts: { id: string; name: string }[] = [];
      for (const row of data ?? []) {
        const r = row as { protocols?: { id: string; name: string } | { id: string; name: string }[] | null };
        const p = r.protocols;
        const pr = Array.isArray(p) ? p[0] : p;
        if (pr?.id && pr?.name) opts.push({ id: pr.id, name: pr.name });
      }
      setProtocolOptions(opts);
    })();
  }, [resolvedCancerTypeId]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const c of cycles) {
      next[c.id] = c.protocol_id ?? "";
    }
    setDraftProtocol(next);
  }, [cycles]);

  function startEdit(cycle: TreatmentCycleRow): void {
    setEditingCycleId(cycle.id);
    setEditStatus(cycle.status);
    setEditPlanned(cycle.planned_sessions != null ? String(cycle.planned_sessions) : "");
    setEditCompleted(cycle.completed_sessions != null ? String(cycle.completed_sessions) : "");
    setEditNotes(cycle.notes ?? "");
  }

  async function saveCycleProtocol(cycleId: string): Promise<void> {
    const protocolIdRaw = draftProtocol[cycleId] ?? "";
    const protocolId = protocolIdRaw === "" ? null : protocolIdRaw;
    const cycle = cycles.find((x) => x.id === cycleId);
    let protocol_name = cycle?.protocol_name ?? "";
    if (protocolId) {
      const fromOpt = protocolOptions.find((p) => p.id === protocolId);
      if (fromOpt) protocol_name = fromOpt.name;
      else {
        const { data } = await supabase.from("protocols").select("name").eq("id", protocolId).maybeSingle();
        if (data && typeof (data as { name?: string }).name === "string") {
          protocol_name = (data as { name: string }).name;
        }
      }
    }
    setProtocolSavingId(cycleId);
    try {
      const updatePayload: { protocol_id: string | null; protocol_name?: string } = { protocol_id: protocolId };
      if (protocolId) {
        updatePayload.protocol_name = protocol_name;
      }
      const { error } = await supabase.from("treatment_cycles").update(updatePayload).eq("id", cycleId);
      if (error) throw error;
      await onUpdated?.();
    } catch (err) {
      console.error(err);
    } finally {
      setProtocolSavingId(null);
    }
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
    } catch (err) {
      console.error(err);
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
          Protocolos e sessões registrados. Os medicamentos da app são listados abaixo (não estão ligados a um ciclo específico
          neste registro).
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
                  c.status === "active" ? "border-[#6366F1]/40" : "border-[#E8EAED]"
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
                    {protocolOptions.length > 0 ? (
                      <div className="mt-3 rounded-xl border border-[#E8EAED] bg-[#FAFBFC] p-3">
                        <p className="text-xs font-semibold text-muted-foreground">Protocolo do catálogo (diretrizes na app)</p>
                        <select
                          className="mt-2 h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm"
                          value={draftProtocol[c.id] ?? ""}
                          onChange={(e) => setDraftProtocol((prev) => ({ ...prev, [c.id]: e.target.value }))}
                        >
                          <option value="">— Texto livre (sem catálogo) —</option>
                          {protocolOptions.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="mt-2 rounded-xl"
                          disabled={
                            protocolSavingId === c.id ||
                            (draftProtocol[c.id] ?? "") === (c.protocol_id ?? "")
                          }
                          onClick={() => void saveCycleProtocol(c.id)}
                        >
                          Guardar associação
                        </Button>
                      </div>
                    ) : resolvedCancerTypeId ? (
                      <p className="mt-2 text-xs text-muted-foreground">Nenhum protocolo no catálogo para este tipo de cancro.</p>
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
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC] text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Data / hora</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Ciclo (id)</th>
                </tr>
              </thead>
              <tbody>
                {sortedInfusions.map((row) => (
                  <tr key={row.id} className="border-b border-[#F1F5F9] last:border-0">
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                      {formatPtDateTime(row.session_at)}
                    </td>
                    <td className="px-4 py-2.5">{INFUSION_STATUS_PT[row.status] ?? row.status}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{row.cycle_id.slice(0, 8)}…</td>
                  </tr>
                ))}
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
