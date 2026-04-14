import { useEffect, useState } from "react";
import type { TreatmentInfusionRow } from "@/src/types/treatment";
import { supabase } from "@/src/lib/supabase";
import { ensureNotificationPermissions, loadExpoNotificationsModule } from "@/src/utils/notifications";

const FEVER_WATCH_PREFIX = "fever-watch-rem-";

const INFUSION_SELECT =
  "id, patient_id, cycle_id, session_at, status, weight_kg, notes, created_at, updated_at";

export function usePatientInfusions(patientId: string | undefined) {
  const [infusions, setInfusions] = useState<TreatmentInfusionRow[]>([]);
  useEffect(() => {
    if (!patientId) {
      setInfusions([]);
      return;
    }
    void (async () => {
      const { data, error } = await supabase
        .from("treatment_infusions")
        .select(INFUSION_SELECT)
        .eq("patient_id", patientId);
      if (error) {
        setInfusions([]);
        return;
      }
      setInfusions((data ?? []) as TreatmentInfusionRow[]);
    })();
  }, [patientId]);
  return infusions;
}

const PREFIX = "symptom-adaptive-";

export async function cancelAdaptiveSymptomReminders(): Promise<void> {
  try {
    const Notifications = await loadExpoNotificationsModule();
    if (!Notifications) return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled.filter((n) => n.identifier.startsWith(PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {
    /* native / scheduler indisponível — não bloquear UI */
  }
}

/**
 * Lembrete local diário (manhã) nos primeiros 7 dias após a última infusão concluída — período de maior toxicidade.
 * Respeita `notify_symptoms` em patient_consents quando disponível.
 */
export function useAdaptiveSymptomReminders(opts: {
  enabled: boolean;
  notifySymptoms: boolean;
  infusions: TreatmentInfusionRow[];
}) {
  useEffect(() => {
    if (!opts.enabled || !opts.notifySymptoms) {
      void cancelAdaptiveSymptomReminders();
      return;
    }
    const completed = opts.infusions
      .filter((i) => i.status === "completed")
      .map((i) => new Date(i.session_at).getTime())
      .filter((t) => !Number.isNaN(t));
    if (completed.length === 0) {
      void cancelAdaptiveSymptomReminders();
      return;
    }
    const lastMs = Math.max(...completed);
    const daysSince = (Date.now() - lastMs) / 86400000;
    if (daysSince > 7) {
      void cancelAdaptiveSymptomReminders();
      return;
    }

    void (async () => {
      const Notifications = await loadExpoNotificationsModule();
      if (!Notifications) return;
      await ensureNotificationPermissions();
      await cancelAdaptiveSymptomReminders();

      const now = new Date();
      for (let d = 0; d < 8; d++) {
        const fire = new Date(now);
        fire.setDate(fire.getDate() + d);
        fire.setHours(9, 30, 0, 0);
        if (fire.getTime() <= Date.now()) continue;
        const id = `${PREFIX}${d}-${fire.getTime()}`;
        await Notifications.scheduleNotificationAsync({
          identifier: id,
          content: {
            title: "Diário de sintomas",
            body: "Registe como se sente hoje — ajuda a equipa na triagem.",
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fire },
        });
      }
    })();
  }, [opts.enabled, opts.notifySymptoms, opts.infusions]);
}

export async function cancelFeverWatchReminders(): Promise<void> {
  try {
    const Notifications = await loadExpoNotificationsModule();
    if (!Notifications) return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(FEVER_WATCH_PREFIX))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {
    /* native / scheduler indisponível */
  }
}

/** Lembretes locais enquanto existir episódio `fever_watch` aberto em `monitoring_episodes`. */
export function useFeverWatchReminders(opts: { enabled: boolean; patientId: string | undefined }) {
  useEffect(() => {
    if (!opts.enabled || !opts.patientId) {
      void cancelFeverWatchReminders();
      return;
    }
    void (async () => {
      const Notifications = await loadExpoNotificationsModule();
      if (!Notifications) return;
      const { data, error } = await supabase
        .from("monitoring_episodes")
        .select("id")
        .eq("patient_id", opts.patientId)
        .is("resolved_at", null)
        .eq("kind", "fever_watch");
      await ensureNotificationPermissions();
      await cancelFeverWatchReminders();
      if (error || !data?.length) return;
      const now = new Date();
      for (let d = 0; d < 7; d++) {
        const fire = new Date(now);
        fire.setDate(fire.getDate() + d);
        fire.setHours(9, 0, 0, 0);
        if (fire.getTime() <= Date.now()) continue;
        const id = `${FEVER_WATCH_PREFIX}${d}-${fire.getTime()}`;
        await Notifications.scheduleNotificationAsync({
          identifier: id,
          content: {
            title: "Febre — vigilância",
            body: "Registe a temperatura no diário. Se estiver melhor, a equipa deixa de ser alertada quando resolver o episódio.",
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fire },
        });
      }
    })();
  }, [opts.enabled, opts.patientId]);
}
