import type { ReactNode } from "react";
import { Pill } from "lucide-react";
import { formatPtDateLong, formatPtDateTime } from "@/lib/dashboardFormat";
import { medicationLogWhenIso, medicationNameFromLog } from "@/lib/patientModalHelpers";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { MedicationLogRow, MedicationRow } from "@/types/dashboard";

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <Pill className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
      <h3 className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">{children}</h3>
    </div>
  );
}

function catalogLabel(m: MedicationRow): string {
  const d = m.display_name?.trim();
  return d || m.name;
}

function scheduleSummary(m: MedicationRow): string {
  const mode = m.repeat_mode ?? "interval_hours";
  if (mode === "as_needed") return "Sob necessidade";
  if (mode === "daily") return "Diário (horários definidos)";
  if (mode === "weekdays") return "Dias úteis";
  if (m.frequency_hours >= 24) {
    const days = Math.round(m.frequency_hours / 24);
    return `A cada ${days} dia(s)`;
  }
  return `A cada ${m.frequency_hours} h`;
}

function logStatusPt(log: MedicationLogRow): string {
  const st = (log.status ?? "").toLowerCase();
  if (st === "taken") return "Tomado";
  if (st === "skipped") return "Não tomado";
  if (st === "pending") return "Pendente";
  if (medicationLogWhenIso(log) && (st === "" || st === "taken")) return "Tomado";
  return log.status ?? "—";
}

type Props = {
  loading: boolean;
  medications: MedicationRow[];
  medicationLogs: MedicationLogRow[];
};

export default function PatientMedicamentosPanel({ loading, medications, medicationLogs }: Props) {
  const sortedCatalog = [...medications].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return catalogLabel(a).localeCompare(catalogLabel(b), "pt-BR");
  });

  return (
    <div className="space-y-10 font-sans">
      <section className="space-y-4">
        <div>
          <SectionTitle>Cadastro na app</SectionTitle>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Medicamentos que o paciente registou na Aura (nome, dose e plano). Itens inativos podem ser histórico ou interrupções.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3" aria-busy="true">
            <div className="h-[4.5rem] animate-pulse rounded-2xl bg-[#F1F5F9]" />
            <div className="h-[4.5rem] animate-pulse rounded-2xl bg-[#F1F5F9]" />
          </div>
        ) : sortedCatalog.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E2E8F0] bg-[#FAFBFC] px-6 py-12 text-center">
            <Pill className="mb-3 size-10 text-muted-foreground/50" strokeWidth={1.25} />
            <p className="text-sm font-medium text-foreground">Nenhum medicamento cadastrado</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Quando o paciente adicionar medicação na app, aparece aqui com dose e frequência.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {sortedCatalog.map((m) => (
              <li
                key={m.id}
                className={cn(
                  "rounded-2xl border bg-white px-4 py-4 shadow-sm",
                  m.active ? "border-[#E8EAED]" : "border-[#E2E8F0] bg-[#FAFAFA]/80 opacity-95"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{catalogLabel(m)}</span>
                      {m.pinned ? (
                        <Badge variant="outline" className="text-[0.65rem] font-semibold">
                          Fixado
                        </Badge>
                      ) : null}
                      {m.active ? (
                        <Badge className="rounded-lg bg-[#DCFCE7] font-bold text-[#166534]">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary" className="font-semibold">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {[m.dosage, m.form, m.unit].filter(Boolean).join(" · ") || "—"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{scheduleSummary(m)}</p>
                    {m.end_date ? (
                      <p className="mt-1 text-xs text-muted-foreground">Fim previsto: {formatPtDateLong(m.end_date)}</p>
                    ) : null}
                    {m.notes?.trim() ? (
                      <p className="mt-2 rounded-xl bg-[#F8FAFC] px-3 py-2 text-xs text-muted-foreground">{m.notes.trim()}</p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <SectionTitle>Registos de toma (app)</SectionTitle>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            O que o paciente marcou como tomado (ou pendente) no lembrete — espelha o registo na aplicação.
          </p>
        </div>

        {loading ? (
          <div className="h-32 animate-pulse rounded-2xl bg-[#F1F5F9]" aria-busy="true" />
        ) : medicationLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E2E8F0] bg-[#FAFBFC] px-6 py-10 text-center text-sm text-muted-foreground">
            Sem registos de medicação visíveis. Confirme vínculo aprovado com o hospital ou peça ao paciente para registar tomas na app.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#E8EAED] bg-white">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC] text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Quando</th>
                  <th className="px-4 py-3 font-semibold">Medicamento</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Qtd</th>
                  <th className="px-4 py-3 font-semibold">Notas</th>
                </tr>
              </thead>
              <tbody>
                {medicationLogs.map((row) => {
                  const when = medicationLogWhenIso(row);
                  return (
                    <tr key={row.id} className="border-b border-[#F1F5F9] last:border-0">
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                        {when ? formatPtDateTime(when) : "—"}
                      </td>
                      <td className="px-4 py-2.5 font-medium">{medicationNameFromLog(row)}</td>
                      <td className="px-4 py-2.5">{logStatusPt(row)}</td>
                      <td className="tabular-nums px-4 py-2.5 text-muted-foreground">{row.quantity ?? "—"}</td>
                      <td className="max-w-[220px] truncate px-4 py-2.5 text-muted-foreground" title={row.notes ?? undefined}>
                        {row.notes?.trim() ? row.notes.trim() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
