import { useEffect, useState, type ReactNode } from "react";
import { ClipboardList, Users } from "lucide-react";
import { toast } from "sonner";
import { CANCER_PT } from "@/constants/dashboardLabels";
import { cn } from "@/lib/utils";
import type { EmergencyContactEmbed, RiskRow } from "@/types/dashboard";
import { supabase } from "@/lib/supabase";
import { sanitizeSupabaseError } from "@/lib/errorMessages";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClinicalEmptyState } from "@/components/patient/ClinicalEmptyState";
import {
  ageFromDob,
  profileDob,
  profileEmailDisplay,
  profileName,
  profilePhoneE164,
} from "@/lib/dashboardProfile";
import { formatPatientCodeDisplay } from "@/lib/patientCode";
import { formatPtShort } from "@/lib/dashboardFormat";

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <ClipboardList className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
      <h3 className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">{children}</h3>
    </div>
  );
}

function FieldBlock({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm", className)}>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="mt-1.5 text-sm leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

type ContactDraft = { id?: string; full_name: string; phone: string; relationship: string };

const SEX_OPTIONS: { value: "" | "M" | "F" | "I" | "O"; label: string }[] = [
  { value: "", label: "Não informar" },
  { value: "M", label: "Masculino" },
  { value: "F", label: "Feminino" },
  { value: "I", label: "Intersexo" },
  { value: "O", label: "Outro" },
];

const BLOOD_OPTIONS = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "ND"] as const;

type Props = {
  loading: boolean;
  riskRow: RiskRow;
  emergencyContacts: EmergencyContactEmbed[];
  /** Chamado após guardar com sucesso (atualizar dossiê). */
  onSaved?: () => void;
};

export default function PatientFichaMedicaPanel({ loading, riskRow, emergencyContacts, onSaved }: Props) {
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [isPregnant, setIsPregnant] = useState<"unset" | "yes" | "no">("unset");
  const [usesContinuousMedication, setUsesContinuousMedication] = useState(false);
  const [continuousMedNotes, setContinuousMedNotes] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [allergies, setAllergies] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [sex, setSex] = useState<"" | "M" | "F" | "I" | "O">("");
  const [bloodType, setBloodType] = useState("");
  const [cpf, setCpf] = useState("");
  const [occupation, setOccupation] = useState("");
  const [insurancePlan, setInsurancePlan] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [contacts, setContacts] = useState<ContactDraft[]>([]);

  const displayName = profileName(riskRow.profiles);
  const dobRaw = profileDob(riskRow.profiles);
  const ageLabel = ageFromDob(dobRaw);
  const codeDisplay = formatPatientCodeDisplay(riskRow.patient_code) ?? `PR-${riskRow.id.slice(0, 8).toUpperCase()}`;
  const phoneDisplay = profilePhoneE164(riskRow.profiles);
  const emailDisplay = profileEmailDisplay(riskRow.profiles);
  const dobFormatted = dobRaw ? formatPtShort(dobRaw) : null;

  useEffect(() => {
    setStage(riskRow.current_stage ?? "");
    setIsPregnant(riskRow.is_pregnant == null ? "unset" : riskRow.is_pregnant ? "yes" : "no");
    setUsesContinuousMedication(riskRow.uses_continuous_medication ?? false);
    setContinuousMedNotes(riskRow.continuous_medication_notes ?? "");
    setMedicalHistory(riskRow.medical_history ?? "");
    setAllergies(riskRow.allergies ?? "");
    setHeightCm(riskRow.height_cm != null ? String(riskRow.height_cm) : "");
    setWeightKg(riskRow.weight_kg != null ? String(riskRow.weight_kg) : "");
    setClinicalNotes(riskRow.clinical_notes ?? "");
    const s = riskRow.sex;
    setSex(s === "M" || s === "F" || s === "I" || s === "O" ? s : "");
    setBloodType(
      riskRow.blood_type && (BLOOD_OPTIONS as readonly string[]).includes(riskRow.blood_type) ? riskRow.blood_type : ""
    );
    setCpf(riskRow.cpf ?? "");
    setOccupation(riskRow.occupation ?? "");
    setInsurancePlan(riskRow.insurance_plan ?? "");
    setAddressCity(riskRow.address_city ?? "");
    setAddressState(riskRow.address_state ?? "");
  }, [
    riskRow.current_stage,
    riskRow.is_pregnant,
    riskRow.uses_continuous_medication,
    riskRow.continuous_medication_notes,
    riskRow.medical_history,
    riskRow.allergies,
    riskRow.height_cm,
    riskRow.weight_kg,
    riskRow.clinical_notes,
    riskRow.sex,
    riskRow.blood_type,
    riskRow.cpf,
    riskRow.occupation,
    riskRow.insurance_plan,
    riskRow.address_city,
    riskRow.address_state,
  ]);

  useEffect(() => {
    setContacts(
      emergencyContacts.map((c) => ({
        id: c.id,
        full_name: c.full_name ?? "",
        phone: c.phone ?? "",
        relationship: c.relationship ?? "",
      }))
    );
  }, [emergencyContacts]);

  async function saveFicha(): Promise<void> {
    setBusy(true);
    try {
      const parsedHeight = heightCm.trim() === "" ? null : Number(heightCm);
      const parsedWeight = weightKg.trim() === "" ? null : Number(weightKg);
      const { error } = await supabase
        .from("patients")
        .update({
          current_stage: stage.trim() || null,
          is_pregnant: isPregnant === "unset" ? null : isPregnant === "yes",
          uses_continuous_medication: usesContinuousMedication,
          continuous_medication_notes: continuousMedNotes.trim() || null,
          medical_history: medicalHistory.trim() || null,
          allergies: allergies.trim() || null,
          height_cm: Number.isFinite(parsedHeight) ? parsedHeight : null,
          weight_kg: Number.isFinite(parsedWeight) ? parsedWeight : null,
          clinical_notes: clinicalNotes.trim() || null,
          sex: sex === "" ? null : sex,
          blood_type: bloodType.trim() === "" ? null : bloodType,
          cpf: cpf.trim() || null,
          occupation: occupation.trim() || null,
          insurance_plan: insurancePlan.trim() || null,
          address_city: addressCity.trim() || null,
          address_state: addressState.trim() || null,
        })
        .eq("id", riskRow.id);
      if (error) throw error;

      const existingIds = new Set(emergencyContacts.map((c) => c.id));
      const keepIds = new Set(contacts.filter((c) => c.id).map((c) => c.id as string));
      for (const id of existingIds) {
        if (!keepIds.has(id)) {
          const { error: delErr } = await supabase.from("patient_emergency_contacts").delete().eq("id", id);
          if (delErr) throw delErr;
        }
      }
      let sortOrder = 0;
      for (const contact of contacts) {
        const payload = {
          patient_id: riskRow.id,
          full_name: contact.full_name.trim() || "—",
          phone: contact.phone.trim() || "—",
          relationship: contact.relationship.trim() || null,
          sort_order: sortOrder++,
        };
        if (contact.id) {
          const { error: updateErr } = await supabase.from("patient_emergency_contacts").update(payload).eq("id", contact.id);
          if (updateErr) throw updateErr;
        } else if (contact.full_name.trim() || contact.phone.trim()) {
          const { error: insertErr } = await supabase.from("patient_emergency_contacts").insert(payload);
          if (insertErr) throw insertErr;
        }
      }
      toast.success("Ficha médica guardada.");
      onSaved?.();
    } catch (err) {
      console.error(err);
      toast.error(sanitizeSupabaseError(err as { code?: string; message?: string }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8 font-sans">
      <div>
        <SectionTitle>Ficha médica (app Aura)</SectionTitle>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Dados preenchidos pelo paciente na app, na área «Ficha médica» do perfil. Leitura conforme vínculo LGPD com o
          hospital. Nome, telefone e e-mail de perfil são atualizados na app pelo paciente.
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
            <h4 className="text-sm font-bold text-foreground">Identificação pessoal</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldBlock label="Nome completo">
                <span className="font-medium">{displayName}</span>
              </FieldBlock>
              <FieldBlock label="Data de nascimento / idade">
                <span className="font-medium">
                  {dobFormatted ?? "—"}
                  {ageLabel ? ` · ${ageLabel}` : ""}
                </span>
              </FieldBlock>
              <FieldBlock label="Código Aura">
                <span className="font-mono text-xs font-semibold">{codeDisplay}</span>
              </FieldBlock>
              <FieldBlock label="Telefone (perfil)">
                <span>{phoneDisplay ?? "—"}</span>
                <p className="mt-1 text-[0.65rem] text-muted-foreground">Editável pelo paciente na app Aura.</p>
              </FieldBlock>
              <FieldBlock label="E-mail (perfil)" className="sm:col-span-2">
                <span>{emailDisplay ?? "—"}</span>
                <p className="mt-1 text-[0.65rem] text-muted-foreground">Campo opcional em perfil; pode ser preenchido na app.</p>
              </FieldBlock>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-bold text-foreground">Dados clínicos (editáveis)</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldBlock label="Sexo biológico">
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as "" | "M" | "F" | "I" | "O")}
                  className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm"
                >
                  {SEX_OPTIONS.map((o) => (
                    <option key={o.value || "unset"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </FieldBlock>
              <FieldBlock label="Tipo sanguíneo">
                <select
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm"
                >
                  <option value="">Não informar</option>
                  {BLOOD_OPTIONS.filter((b) => b !== "").map((b) => (
                    <option key={b} value={b}>
                      {b === "ND" ? "Não determinado" : b}
                    </option>
                  ))}
                </select>
              </FieldBlock>
              <FieldBlock label="Altura (cm)">
                <Input value={heightCm} onChange={(e) => setHeightCm(e.target.value)} type="number" className="rounded-xl" />
              </FieldBlock>
              <FieldBlock label="Peso (kg)">
                <Input value={weightKg} onChange={(e) => setWeightKg(e.target.value)} type="number" className="rounded-xl" />
              </FieldBlock>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-bold text-foreground">Dados administrativos</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldBlock label="CPF">
                <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" className="rounded-xl" />
              </FieldBlock>
              <FieldBlock label="Profissão">
                <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="Ocupação" className="rounded-xl" />
              </FieldBlock>
              <FieldBlock label="Convênio / plano de saúde" className="sm:col-span-2">
                <Input
                  value={insurancePlan}
                  onChange={(e) => setInsurancePlan(e.target.value)}
                  placeholder="Nome do plano"
                  className="rounded-xl"
                />
              </FieldBlock>
              <FieldBlock label="Cidade">
                <Input value={addressCity} onChange={(e) => setAddressCity(e.target.value)} className="rounded-xl" />
              </FieldBlock>
              <FieldBlock label="Estado (UF)">
                <Input value={addressState} onChange={(e) => setAddressState(e.target.value)} placeholder="Ex.: SP" maxLength={2} className="rounded-xl uppercase" />
              </FieldBlock>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-bold text-foreground">Resumo oncológico</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldBlock label="Tipo de câncer (resumo)">
                {CANCER_PT[riskRow.primary_cancer_type] ?? riskRow.primary_cancer_type}
              </FieldBlock>
              <FieldBlock label="Estágio (editável)">
                <Input value={stage} onChange={(e) => setStage(e.target.value)} placeholder="Ex.: estádio III" className="rounded-xl" />
              </FieldBlock>
              <FieldBlock label="Gravidez (editável)">
                <select
                  value={isPregnant}
                  onChange={(e) => setIsPregnant(e.target.value as "unset" | "yes" | "no")}
                  className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm"
                >
                  <option value="unset">Não informar</option>
                  <option value="no">Não</option>
                  <option value="yes">Sim</option>
                </select>
              </FieldBlock>
              <FieldBlock label="Nadir (automático)">
                {riskRow.is_in_nadir ? (
                  <span className="font-medium text-destructive">Na janela de nadir — vigilância febril</span>
                ) : (
                  <span>Fora da janela habitual</span>
                )}
              </FieldBlock>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-bold text-foreground">Medicação de base</h4>
            <FieldBlock label="Uso contínuo de medicamentos (editável)">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={usesContinuousMedication}
                  onChange={(e) => setUsesContinuousMedication(e.target.checked)}
                />
                <span className="font-medium">{usesContinuousMedication ? "Sim" : "Não"}</span>
              </label>
            </FieldBlock>
            <FieldBlock label="Quais medicamentos (texto livre)">
              <Input
                value={continuousMedNotes}
                onChange={(e) => setContinuousMedNotes(e.target.value)}
                placeholder="Ex.: levotiroxina 75 ug"
                className="rounded-xl"
              />
            </FieldBlock>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-bold text-foreground">Antecedentes e alergias</h4>
            <FieldBlock label="Doenças e condições anteriores">
              <textarea
                value={medicalHistory}
                onChange={(e) => setMedicalHistory(e.target.value)}
                placeholder="Histórico relevante"
                className="min-h-[90px] w-full rounded-xl border border-[#E2E8F0] p-3 text-sm"
              />
            </FieldBlock>
            <FieldBlock label="Alergias">
              <textarea
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="Alergias medicamentosas ou alimentares"
                className="min-h-[90px] w-full rounded-xl border border-[#E2E8F0] p-3 text-sm"
              />
            </FieldBlock>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-bold text-foreground">Notas clínicas</h4>
            <FieldBlock label="Notas clínicas (ficha)">
              <textarea
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Observações clínicas"
                className="min-h-[120px] w-full rounded-xl border border-[#E2E8F0] p-3 text-sm"
              />
            </FieldBlock>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-bold text-foreground">Contactos de emergência</h4>
            {contacts.length === 0 ? (
              <ClinicalEmptyState
                icon={Users}
                title="Sem contactos de emergência"
                description="Adicione contactos para situações urgentes ou peça ao paciente para completar na app."
              />
            ) : (
              <ul className="space-y-3">
                {contacts.map((c, i) => (
                  <li
                    key={c.id ?? `new-${i}`}
                    className={cn(
                      "rounded-2xl border border-[#E8EAED] bg-white px-4 py-4 shadow-sm",
                      i > 0 && "mt-1"
                    )}
                  >
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        value={c.full_name}
                        onChange={(e) => {
                          const next = [...contacts];
                          next[i] = { ...next[i], full_name: e.target.value };
                          setContacts(next);
                        }}
                        placeholder="Nome"
                        className="rounded-xl"
                      />
                      <Input
                        value={c.phone}
                        onChange={(e) => {
                          const next = [...contacts];
                          next[i] = { ...next[i], phone: e.target.value };
                          setContacts(next);
                        }}
                        placeholder="Telefone"
                        className="rounded-xl"
                      />
                      <Input
                        value={c.relationship}
                        onChange={(e) => {
                          const next = [...contacts];
                          next[i] = { ...next[i], relationship: e.target.value };
                          setContacts(next);
                        }}
                        placeholder="Parentesco"
                        className="rounded-xl sm:col-span-2"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-fit rounded-xl"
                        onClick={() => setContacts(contacts.filter((_, idx) => idx !== i))}
                      >
                        Remover contato
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setContacts([...contacts, { full_name: "", phone: "", relationship: "" }])}
            >
              Adicionar contato
            </Button>
          </section>
          <div className="flex justify-end">
            <Button type="button" className="rounded-xl" disabled={busy} onClick={() => void saveFicha()}>
              {busy ? "Guardando..." : "Guardar ficha"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
