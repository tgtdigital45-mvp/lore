import type { MedicationRow, TreatmentCycleRow, TreatmentInfusionRow } from "@/types/dashboard";
import { CYCLE_STATUS_PT, TREATMENT_KIND_PT } from "@/constants/dashboardLabels";
import { formatPtDateLong, formatPtDateTime } from "@/lib/dashboardFormat";
import { cn } from "@/lib/utils";

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
};

export default function PatientTratamentoPanel({ loading, cycles, infusions, medications }: Props) {
  const sortedCycles = [...cycles].sort((a, b) => b.start_date.localeCompare(a.start_date));
  const sortedInfusions = [...infusions].sort(
    (a, b) => new Date(b.session_at).getTime() - new Date(a.session_at).getTime()
  );

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
          Protocolos e sessões registados. Os medicamentos da app são listados abaixo (não estão ligados a um ciclo específico
          neste registo).
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
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
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
                    {c.notes?.trim() ? (
                      <p className="mt-2 rounded-xl bg-[#F8FAFC] px-3 py-2 text-xs text-muted-foreground">{c.notes.trim()}</p>
                    ) : null}
                  </div>
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
            Nenhuma infusão registada.
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
