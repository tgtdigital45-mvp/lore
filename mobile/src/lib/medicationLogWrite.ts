import { supabase } from "@/src/lib/supabase";

export type RecordDoseTakenParams = {
  patientId: string;
  medicationId: string;
  /** Instante da janela agendada (deve coincidir com computeNextDose / modal). */
  scheduledTimeIso: string;
  /** Hora em que o utilizador confirmou; por defeito agora. */
  takenTimeIso?: string;
};

/** Idempotente: atualiza a mesma linha se já existir para este par (medicação, horário agendado). */
export async function recordDoseTaken(params: RecordDoseTakenParams): Promise<{ error: Error | null }> {
  const takenTimeIso = params.takenTimeIso ?? new Date().toISOString();
  const { error } = await supabase.from("medication_logs").upsert(
    {
      patient_id: params.patientId,
      medication_id: params.medicationId,
      scheduled_time: params.scheduledTimeIso,
      taken_time: takenTimeIso,
      status: "taken",
      quantity: 1,
    },
    { onConflict: "medication_id,scheduled_time" }
  );
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

export type RecordDoseSkippedParams = {
  patientId: string;
  medicationId: string;
  scheduledTimeIso: string;
};

/** Idempotente: marca a janela como não tomada (`skipped`). */
export async function recordDoseSkipped(params: RecordDoseSkippedParams): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("medication_logs").upsert(
    {
      patient_id: params.patientId,
      medication_id: params.medicationId,
      scheduled_time: params.scheduledTimeIso,
      taken_time: null,
      status: "skipped",
      quantity: 1,
    },
    { onConflict: "medication_id,scheduled_time" }
  );
  if (error) return { error: new Error(error.message) };
  return { error: null };
}
