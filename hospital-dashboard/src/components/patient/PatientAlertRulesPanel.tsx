import { useState } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { MedicationRow, PatientAlertRule, PatientAlertRuleKind } from "@/types/dashboard";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sanitizeSupabaseError } from "@/lib/errorMessages";
import { ClinicalEmptyState } from "@/components/patient/ClinicalEmptyState";

type Props = {
  patientId: string;
  medications: MedicationRow[];
  rules: PatientAlertRule[];
  onRefresh: () => void;
};

const KIND_LABEL: Record<PatientAlertRuleKind, string> = {
  symptom_fever: "Febre",
  medication_overuse: "Superdosagem",
  custom: "Personalizado",
};

const SEVERITY_OPTIONS = [
  { value: "high", label: "Alta" },
  { value: "medium", label: "Média" },
  { value: "low", label: "Baixa" },
];

function medLabel(m: MedicationRow): string {
  return m.display_name?.trim() || m.name;
}

export function PatientAlertRulesPanel({ patientId, medications, rules, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [formKind, setFormKind] = useState<PatientAlertRuleKind>("symptom_fever");
  const [formName, setFormName] = useState("");
  const [minCelsius, setMinCelsius] = useState("37.8");
  const [medicationId, setMedicationId] = useState("");
  const [maxDoses, setMaxDoses] = useState("1");
  const [windowHours, setWindowHours] = useState("24");
  const [customJson, setCustomJson] = useState("{}");
  const [severity, setSeverity] = useState("high");
  const [actionNote, setActionNote] = useState("");
  const [formPush, setFormPush] = useState(true);
  const [formWa, setFormWa] = useState(false);
  const [formSms, setFormSms] = useState(false);
  const [activeFrom, setActiveFrom] = useState("06:00");
  const [activeUntil, setActiveUntil] = useState("23:00");
  const [snoozeHours, setSnoozeHours] = useState("4");
  const [busy, setBusy] = useState(false);
  const [toggleBusyId, setToggleBusyId] = useState<string | null>(null);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeJson, setMergeJson] = useState<string>("");
  const [mergeBusy, setMergeBusy] = useState(false);

  function resetForm(): void {
    setFormKind("symptom_fever");
    setFormName("");
    setMinCelsius("37.8");
    setMedicationId(medications[0]?.id ?? "");
    setMaxDoses("1");
    setWindowHours("24");
    setCustomJson("{}");
    setSeverity("high");
    setActionNote("");
  }

  async function handleCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    let condition: Record<string, unknown> = {};
    let name = formName.trim();

    if (formKind === "symptom_fever") {
      const v = Number(minCelsius.replace(",", "."));
      if (!Number.isFinite(v) || v < 35 || v > 42) {
        window.alert("Indique um limiar de febre entre 35 e 42 °C.");
        return;
      }
      condition = { min_celsius: v };
      if (!name) name = `Febre ≥ ${v}°C`;
    } else if (formKind === "medication_overuse") {
      if (!medicationId) {
        window.alert("Selecione um medicamento.");
        return;
      }
      const maxD = Number(maxDoses);
      const wh = Number(windowHours);
      if (!Number.isFinite(maxD) || maxD < 1) {
        window.alert("Número máximo de tomas deve ser ≥ 1.");
        return;
      }
      if (!Number.isFinite(wh) || wh < 1) {
        window.alert("Janela (horas) deve ser ≥ 1.");
        return;
      }
      condition = { medication_id: medicationId, max_doses: maxD, window_hours: wh };
      const med = medications.find((m) => m.id === medicationId);
      if (!name) name = `Superdosagem — ${med ? medLabel(med) : "medicamento"}`;
    } else {
      try {
        const parsed = JSON.parse(customJson) as unknown;
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
          window.alert("Condição JSON deve ser um objeto.");
          return;
        }
        condition = parsed as Record<string, unknown>;
      } catch {
        window.alert("JSON inválido na condição.");
        return;
      }
      if (!name) {
        window.alert("Indique um nome para o alerta personalizado.");
        return;
      }
    }

    setBusy(true);
    try {
      const snooze = Number(snoozeHours);
      const { error } = await supabase.from("patient_alert_rules").insert({
        patient_id: patientId,
        name,
        kind: formKind,
        condition,
        severity,
        action_note: actionNote.trim() || null,
        enabled: true,
        rule_type: "patient",
        channels: { push: formPush, whatsapp: formWa, sms: formSms },
        active_from: activeFrom || null,
        active_until: activeUntil || null,
        snooze_hours: Number.isFinite(snooze) ? snooze : null,
      });
      if (error) throw error;
      resetForm();
      setShowForm(false);
      onRefresh();
      toast.success("Regra de alerta criada.");
    } catch (err) {
      console.error(err);
      toast.error(sanitizeSupabaseError(err as { code?: string; message?: string }));
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(rule: PatientAlertRule): Promise<void> {
    setToggleBusyId(rule.id);
    try {
      const { error } = await supabase.from("patient_alert_rules").update({ enabled: !rule.enabled }).eq("id", rule.id);
      if (error) throw error;
      onRefresh();
      toast.success(rule.enabled ? "Alerta desativado." : "Alerta ativado.");
    } catch (err) {
      console.error(err);
      toast.error(sanitizeSupabaseError(err as { code?: string; message?: string }));
    } finally {
      setToggleBusyId(null);
    }
  }

  async function removeRule(id: string): Promise<void> {
    if (!window.confirm("Remover esta regra de alerta?")) return;
    setDeleteBusyId(id);
    try {
      const { error } = await supabase.from("patient_alert_rules").delete().eq("id", id);
      if (error) throw error;
      onRefresh();
      toast.success("Regra removida.");
    } catch (err) {
      console.error(err);
      toast.error(sanitizeSupabaseError(err as { code?: string; message?: string }));
    } finally {
      setDeleteBusyId(null);
    }
  }

  async function loadMerged(): Promise<void> {
    setMergeBusy(true);
    try {
      const { data, error } = await supabase.rpc("get_merged_alert_rules", { p_patient_id: patientId });
      if (error) throw error;
      setMergeJson(JSON.stringify(data, null, 2));
      setMergeOpen(true);
    } catch (err) {
      toast.error(sanitizeSupabaseError(err as { code?: string; message?: string }));
    } finally {
      setMergeBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Configuração de alertas do paciente</h2>
        <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="rounded-xl"
          disabled={mergeBusy}
          onClick={() => void loadMerged()}
        >
          {mergeBusy ? "…" : "Ver merge 3 camadas"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => {
            resetForm();
            setMedicationId(medications[0]?.id ?? "");
            setShowForm((s) => !s);
          }}
        >
          {showForm ? (
            "Fechar"
          ) : (
            <>
              <Plus className="mr-1 size-4" />
              Adicionar alerta
            </>
          )}
        </Button>
        </div>
      </div>

      {mergeOpen ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-950 p-3 text-slate-100 shadow-inner">
          <div className="mb-2 flex justify-between gap-2 text-xs font-semibold">
            <span>Regras combinadas (hospital → protocolo → paciente)</span>
            <button type="button" className="text-teal-300 underline" onClick={() => setMergeOpen(false)}>
              Fechar
            </button>
          </div>
          <pre className="max-h-64 overflow-auto text-[0.65rem] leading-relaxed">{mergeJson}</pre>
        </div>
      ) : null}

      {showForm ? (
        <form onSubmit={(e) => void handleCreate(e)} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Tipo de alerta</label>
            <select
              value={formKind}
              onChange={(e) => setFormKind(e.target.value as PatientAlertRuleKind)}
              className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm"
            >
              <option value="symptom_fever">Febre (limiar °C)</option>
              <option value="medication_overuse">Superdosagem de medicamento</option>
              <option value="custom">Personalizado (JSON)</option>
            </select>
          </div>

          {formKind === "symptom_fever" ? (
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Limiar mínimo (°C)</label>
              <Input
                type="text"
                inputMode="decimal"
                value={minCelsius}
                onChange={(e) => setMinCelsius(e.target.value)}
                className="rounded-xl"
                placeholder="37.8"
              />
            </div>
          ) : null}

          {formKind === "medication_overuse" ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Medicamento</label>
                <select
                  value={medicationId}
                  onChange={(e) => setMedicationId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm"
                >
                  <option value="">— Selecionar —</option>
                  {medications.map((m) => (
                    <option key={m.id} value={m.id}>
                      {medLabel(m)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Máx. tomas na janela</label>
                  <Input type="number" min={1} value={maxDoses} onChange={(e) => setMaxDoses(e.target.value)} className="rounded-xl" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Janela (horas)</label>
                  <Input type="number" min={1} value={windowHours} onChange={(e) => setWindowHours(e.target.value)} className="rounded-xl" />
                </div>
              </div>
            </>
          ) : null}

          {formKind === "custom" ? (
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Condição (JSON)</label>
              <textarea
                value={customJson}
                onChange={(e) => setCustomJson(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 font-mono text-xs"
              />
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Nome (opcional se gerado automaticamente)</label>
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} className="rounded-xl" placeholder="Ex.: Alerta febre pós-ciclo" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Gravidade</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm">
              {SEVERITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Nota de ação (opcional)</label>
            <Input
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              className="rounded-xl"
              placeholder="Ex.: Contactar equipe se persistir"
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Canais de notificação</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formPush} onChange={(e) => setFormPush(e.target.checked)} />
                Push
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formWa} onChange={(e) => setFormWa(e.target.checked)} />
                WhatsApp
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formSms} onChange={(e) => setFormSms(e.target.checked)} />
                SMS
              </label>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Ativo desde</label>
              <Input type="time" value={activeFrom} onChange={(e) => setActiveFrom(e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Ativo até</label>
              <Input type="time" value={activeUntil} onChange={(e) => setActiveUntil(e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Silenciar (h após 1.º alerta)</label>
              <Input type="number" min={0} value={snoozeHours} onChange={(e) => setSnoozeHours(e.target.value)} className="rounded-xl" />
            </div>
          </div>

          <Button type="submit" size="sm" className="rounded-xl" disabled={busy}>
            {busy ? "A guardar…" : "Criar alerta"}
          </Button>
        </form>
      ) : null}

      <ul className="space-y-2">
        {rules.length === 0 ? (
          <li className="list-none">
            <ClinicalEmptyState
              icon={Bell}
              title="Nenhuma regra personalizada"
              description='Use "Adicionar alerta" para definir febre, superdosagem ou condição JSON.'
            />
          </li>
        ) : (
          rules.map((r) => (
            <li
              key={r.id}
              className={cn(
                "flex flex-wrap items-start justify-between gap-2 rounded-2xl border px-3 py-2.5 text-sm",
                r.enabled ? "border-[#E8EAED] bg-white" : "border-dashed border-[#E2E8F0] bg-[#F8FAFC] opacity-80"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">{r.name}</span>
                  <span className="rounded-md bg-[#EEF2FF] px-2 py-0.5 text-[0.65rem] font-bold uppercase text-[#4338CA]">
                    {KIND_LABEL[r.kind] ?? r.kind}
                  </span>
                  <span className="text-[0.65rem] text-muted-foreground">
                    {SEVERITY_OPTIONS.find((s) => s.value === r.severity)?.label ?? r.severity}
                  </span>
                </div>
                {r.action_note ? <p className="mt-1 text-xs text-muted-foreground">{r.action_note}</p> : null}
                {r.channels ? (
                  <p className="mt-1 text-[0.65rem] text-muted-foreground">
                    Canais:{" "}
                    {[
                      r.channels.push ? "Push" : null,
                      r.channels.whatsapp ? "WA" : null,
                      r.channels.sms ? "SMS" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                    {r.snooze_hours != null ? ` · silenciar ${r.snooze_hours}h` : ""}
                  </p>
                ) : null}
                <pre className="mt-1 max-h-20 overflow-auto rounded-lg bg-[#F1F5F9] p-2 text-[0.65rem] leading-relaxed text-muted-foreground">
                  {JSON.stringify(r.condition, null, 0)}
                </pre>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={r.enabled}
                    disabled={toggleBusyId === r.id}
                    onChange={() => void toggleEnabled(r)}
                    className="rounded border-[#CBD5E1]"
                  />
                  Ativo
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-lg text-destructive hover:bg-destructive/10"
                  disabled={deleteBusyId === r.id}
                  onClick={() => void removeRule(r.id)}
                  aria-label="Remover regra"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
