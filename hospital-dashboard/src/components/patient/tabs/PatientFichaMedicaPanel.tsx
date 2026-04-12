import type { ReactNode } from "react";
import { ClipboardList } from "lucide-react";
import { CANCER_PT } from "@/constants/dashboardLabels";
import { cn } from "@/lib/utils";
import type { EmergencyContactEmbed, RiskRow } from "@/types/dashboard";

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <ClipboardList className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
      <h3 className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">{children}</h3>
    </div>
  );
}

function FieldBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#E8EAED] bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="mt-1.5 text-sm leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

function textOrDash(s: string | null | undefined): string {
  const t = s?.trim();
  return t ? t : "—";
}

function pregnancyLabel(v: boolean | null | undefined): string {
  if (v === null || v === undefined) return "Não informado";
  return v ? "Sim" : "Não";
}

function fmtCm(v: number | string | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? `${n} cm` : "—";
}

function fmtKg(v: number | string | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? `${n} kg` : "—";
}

type Props = {
  loading: boolean;
  riskRow: RiskRow;
  emergencyContacts: EmergencyContactEmbed[];
};

export default function PatientFichaMedicaPanel({ loading, riskRow, emergencyContacts }: Props) {
  return (
    <div className="space-y-8 font-sans">
      <div>
        <SectionTitle>Ficha médica (app Aura)</SectionTitle>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Dados preenchidos pelo paciente na app, na área «Ficha médica» do perfil. Leitura conforme vínculo LGPD com o hospital.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          <div className="h-24 animate-pulse rounded-2xl bg-[#F1F5F9]" />
          <div className="h-24 animate-pulse rounded-2xl bg-[#F1F5F9]" />
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h4 className="text-sm font-bold text-foreground">Resumo oncológico</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldBlock label="Tipo de câncer (resumo)">
                {CANCER_PT[riskRow.primary_cancer_type] ?? riskRow.primary_cancer_type}
              </FieldBlock>
              <FieldBlock label="Estágio">{textOrDash(riskRow.current_stage)}</FieldBlock>
              <FieldBlock label="Gravidez">{pregnancyLabel(riskRow.is_pregnant)}</FieldBlock>
              <FieldBlock label="Nadir (automático)">
                {riskRow.is_in_nadir ? (
                  <span className="font-medium text-[#B91C1C]">Na janela de nadir — vigilância febril</span>
                ) : (
                  <span>Fora da janela habitual</span>
                )}
              </FieldBlock>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-bold text-foreground">Medicação de base</h4>
            <FieldBlock label="Uso contínuo de medicamentos">
              <span className="font-medium">{riskRow.uses_continuous_medication ? "Sim" : "Não"}</span>
            </FieldBlock>
            <FieldBlock label="Quais medicamentos (texto livre)">
              {textOrDash(riskRow.continuous_medication_notes)}
            </FieldBlock>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-bold text-foreground">Antecedentes e alergias</h4>
            <FieldBlock label="Doenças e condições anteriores">
              <p className="whitespace-pre-wrap">{textOrDash(riskRow.medical_history)}</p>
            </FieldBlock>
            <FieldBlock label="Alergias">
              <p className="whitespace-pre-wrap">{textOrDash(riskRow.allergies)}</p>
            </FieldBlock>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-bold text-foreground">Medidas e notas</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldBlock label="Altura (ficha)">{fmtCm(riskRow.height_cm)}</FieldBlock>
              <FieldBlock label="Peso (ficha)">{fmtKg(riskRow.weight_kg)}</FieldBlock>
            </div>
            <FieldBlock label="Notas clínicas (ficha)">
              <p className="whitespace-pre-wrap">{textOrDash(riskRow.clinical_notes)}</p>
            </FieldBlock>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-bold text-foreground">Contactos de emergência</h4>
            {emergencyContacts.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#E2E8F0] bg-[#FAFBFC] px-4 py-8 text-center text-sm text-muted-foreground">
                Sem contactos registados ou sem permissão de leitura.
              </p>
            ) : (
              <ul className="space-y-3">
                {emergencyContacts.map((c, i) => (
                  <li
                    key={c.id}
                    className={cn(
                      "rounded-2xl border border-[#E8EAED] bg-white px-4 py-4 shadow-sm",
                      i > 0 && "mt-1"
                    )}
                  >
                    <p className="font-semibold text-foreground">{c.full_name || "—"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground/90">Telefone:</span> {c.phone || "—"}
                    </p>
                    {c.relationship?.trim() ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground/90">Parentesco:</span> {c.relationship.trim()}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
