import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pill, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { refreshSupabaseSessionIfStale } from "@/lib/authSession";
import { staffApiRequestUrl, hasStaffBackendForFetch } from "@/lib/backendUrl";
import { sanitizeHttpApiMessage } from "@/lib/errorMessages";
import { modalOverlayTransition, modalPanelTransition } from "@/lib/motionPresets";
import type { PrescriptionOcrItem } from "@/types/prescriptionOcr";

async function getFreshToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const fresh = await refreshSupabaseSessionIfStale(data.session);
  return fresh?.access_token ?? null;
}

type EditableRow = PrescriptionOcrItem & { include: boolean; clientId: string };

const FREQ_SELECT = [6, 8, 12, 24, 48] as const;

function snapFrequencyHours(h: number): number {
  const n = Math.min(168, Math.max(1, Math.round(h)));
  return FREQ_SELECT.includes(n as (typeof FREQ_SELECT)[number]) ? n : 24;
}

function makeRows(items: PrescriptionOcrItem[]): EditableRow[] {
  return items.map((it, i) => ({
    ...it,
    frequency_hours: snapFrequencyHours(Number(it.frequency_hours) || 24),
    include: true,
    clientId: `rx-${i}-${it.name.slice(0, 12)}`,
  }));
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: PrescriptionOcrItem[];
  patientId: string;
  backendUrl: string;
  onConfirmed: () => void;
};

export function PrescriptionMedsConfirmModal({ open, onOpenChange, items, patientId, backendUrl, onConfirmed }: Props) {
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && items.length > 0) {
      setRows(makeRows(items));
    }
  }, [open, items]);

  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  const updateRow = useCallback((clientId: string, patch: Partial<EditableRow>) => {
    setRows((r) => r.map((x) => (x.clientId === clientId ? { ...x, ...patch } : x)));
  }, []);

  const submit = useCallback(async () => {
    const selected = rows.filter((r) => r.include);
    if (selected.length === 0) {
      window.alert("Marque pelo menos um medicamento.");
      return;
    }
    if (!hasStaffBackendForFetch(backendUrl)) {
      window.alert("Backend não configurado (VITE_BACKEND_URL).");
      return;
    }
    setSubmitting(true);
    try {
      const token = await getFreshToken();
      if (!token) {
        window.alert("Sessão expirada. Faça login novamente.");
        return;
      }
      const anchor = new Date();
      anchor.setHours(8, 0, 0, 0);
      const body = {
        items: selected.map((r) => ({
          name: r.name.trim(),
          dosage: r.dosage ?? "",
          form: r.form ?? "",
          notes: r.notes ?? "",
          posology: r.posology ?? "",
          frequency_hours: Math.min(168, Math.max(1, Math.round(Number(r.frequency_hours) || 24))),
          duration_days: r.duration_days,
          anchor_at: anchor.toISOString(),
        })),
      };
      const url = staffApiRequestUrl(backendUrl, `/api/staff/patients/${patientId}/medications/from-prescription`);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { error?: string; message?: string; inserted?: number };
      if (!res.ok) {
        window.alert(sanitizeHttpApiMessage((j.message as string | undefined) ?? j.error, `Erro ${res.status}`));
        return;
      }
      onConfirmed();
      onOpenChange(false);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Falha de rede.");
    } finally {
      setSubmitting(false);
    }
  }, [rows, backendUrl, patientId, onConfirmed, onOpenChange]);

  return (
    <AnimatePresence>
      {open && rows.length > 0 ? (
        <motion.div
          key="rx-meds-overlay"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/35 p-4 backdrop-blur-[10px] sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rx-meds-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={modalOverlayTransition}
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            className="dossier-modal-mesh max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] p-6 shadow-2xl"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={modalPanelTransition}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <Pill className="mt-0.5 h-5 w-5 text-teal-600" aria-hidden />
                <div>
                  <h2 id="rx-meds-title" className="text-lg font-black tracking-tight">
                    Medicamentos da receita
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Revise e confirme o registo na aba Medicamentos. Pode ajustar frequência e duração antes de gravar.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
                onClick={() => onOpenChange(false)}
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {rows.map((r) => (
                <div
                  key={r.clientId}
                  className="rounded-2xl border border-border/80 bg-card/50 p-4"
                >
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-border"
                      checked={r.include}
                      onChange={(e) => updateRow(r.clientId, { include: e.target.checked })}
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <div className="text-xs font-semibold uppercase text-muted-foreground">Nome</div>
                        <Input
                          value={r.name}
                          onChange={(e) => updateRow(r.clientId, { name: e.target.value })}
                          className="mt-0.5"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs font-semibold uppercase text-muted-foreground">Dose</div>
                          <Input
                            value={r.dosage}
                            onChange={(e) => updateRow(r.clientId, { dosage: e.target.value })}
                            className="mt-0.5"
                          />
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase text-muted-foreground">Forma</div>
                          <Input
                            value={r.form}
                            onChange={(e) => updateRow(r.clientId, { form: e.target.value })}
                            className="mt-0.5"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase text-muted-foreground">A cada (horas)</div>
                        <select
                          className="mt-0.5 flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                          value={snapFrequencyHours(r.frequency_hours)}
                          onChange={(e) => updateRow(r.clientId, { frequency_hours: Number(e.target.value) })}
                        >
                          {FREQ_SELECT.map((h) => (
                            <option key={h} value={h}>
                              {h} h
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase text-muted-foreground">Dias de tratamento (vazio = sem fim)</div>
                        <Input
                          type="number"
                          min={1}
                          max={3650}
                          placeholder="ex.: 7"
                          value={r.duration_days == null ? "" : String(r.duration_days)}
                          onChange={(e) => {
                            const v = e.target.value.trim();
                            if (v === "") updateRow(r.clientId, { duration_days: null });
                            else {
                              const n = parseInt(v, 10);
                              if (!Number.isNaN(n) && n > 0) updateRow(r.clientId, { duration_days: n });
                            }
                          }}
                          className="mt-0.5"
                        />
                      </div>
                      {r.posology?.trim() ? (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Posologia (IA):</span> {r.posology.trim()}
                        </p>
                      ) : null}
                    </div>
                  </label>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Agora não
              </Button>
              <Button type="button" onClick={() => void submit()} disabled={submitting}>
                {submitting ? "A gravar…" : "Confirmar medicamentos"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
