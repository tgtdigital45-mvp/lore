import { useState } from "react";
import { toast } from "sonner";
import type { PatientAppointmentRow } from "@/types/dashboard";
import { formatPtDateTime } from "@/lib/dashboardFormat";
import { supabase } from "@/lib/supabase";
import { sanitizeSupabaseError } from "@/lib/errorMessages";
import { Button } from "@/components/ui/button";

type Props = {
  modalLoading: boolean;
  appointments: PatientAppointmentRow[];
  onRefresh: () => void;
};

function kindLabel(kind: string): string {
  if (kind === "exam") return "Exame";
  if (kind === "consult") return "Consulta";
  if (kind === "infusion") return "Infusão (agenda hospitalar)";
  return "Outro";
}

function cardBorderClass(a: PatientAppointmentRow): string {
  const t = new Date(a.starts_at).getTime();
  const past = t < Date.now();
  if (!past) return "border-l-4 border-blue-500 bg-white/80";
  if (a.checked_in_at) return "border-l-4 border-emerald-600 bg-emerald-50/40";
  return "border-l-4 border-dashed border-amber-400 bg-amber-50/30";
}

export default function PatientAgendamentosPanel({ modalLoading, appointments, onRefresh }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setStaffCheckIn(id: string, checkedIn: boolean) {
    setBusyId(id);
    try {
      const { error } = await supabase.rpc("rpc_staff_set_appointment_checkin", {
        p_appointment_id: id,
        p_checked_in: checkedIn,
      });
      if (error) {
        toast.error(sanitizeSupabaseError(error));
        return;
      }
      toast.success(checkedIn ? "Presença registada." : "Check-in removido.");
      onRefresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="patient-modal__tab-panel space-y-4">
      <p className="muted text-sm">
        Mesmos compromissos do calendário na app Aura (incluindo infusões sincronizadas pela unidade). Check-in pode ser
        feito pelo paciente no telemóvel ou pela equipa aqui.
      </p>
      {modalLoading ? (
        <p className="muted patient-modal__loading">A carregar…</p>
      ) : appointments.length === 0 ? (
        <p className="muted">Sem agendamentos registados.</p>
      ) : (
        <ul className="space-y-3">
          {appointments.map((a) => {
            const past = new Date(a.starts_at).getTime() < Date.now();
            return (
              <li
                key={a.id}
                className={`rounded-2xl border border-slate-200/80 p-4 shadow-sm ${cardBorderClass(a)}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPtDateTime(a.starts_at)} · {kindLabel(a.kind)}
                      {a.pinned ? " · fixado" : ""}
                    </p>
                    {a.notes ? <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{a.notes}</p> : null}
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right">
                    {a.checked_in_at ? (
                      <span className="text-xs font-medium text-emerald-800">
                        Check-in: {formatPtDateTime(a.checked_in_at)}
                        {a.checked_in_source === "staff"
                          ? " (equipa)"
                          : a.checked_in_source === "patient"
                            ? " (paciente)"
                            : ""}
                      </span>
                    ) : past ? (
                      <span className="text-xs font-medium text-amber-800">Sem registo de presença</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Agendado</span>
                    )}
                    <div className="flex flex-wrap justify-end gap-2">
                      {a.checked_in_at ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full text-xs"
                          disabled={busyId === a.id}
                          onClick={() => void setStaffCheckIn(a.id, false)}
                        >
                          Anular check-in
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-full text-xs"
                          disabled={busyId === a.id}
                          onClick={() => void setStaffCheckIn(a.id, true)}
                        >
                          Marcar presença
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
