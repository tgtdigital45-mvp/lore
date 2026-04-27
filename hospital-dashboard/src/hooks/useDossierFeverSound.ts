import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { getOrCreateAudioContext, playFeverBeepOnContext } from "@/lib/dossierFeverBeep";
import type { MergedAlertRules, PatientAlertRule, SymptomLogDetail } from "@/types/dashboard";

const STORAGE_KEY = "oncocare:dossier-fever-sound";

function feverMinsFromPatientRules(rules: PatientAlertRule[] | null | undefined): number[] {
  const out: number[] = [];
  for (const r of rules ?? []) {
    if (!r.enabled || r.kind !== "symptom_fever") continue;
    const raw = (r.condition as { min_celsius?: unknown } | null)?.min_celsius;
    const m = Number(raw);
    if (Number.isFinite(m)) out.push(m);
  }
  return out;
}

/**
 * Lembretes: regras do paciente, ou o limiar global da triagem.
 */
function resolveFeverCelsiusMins(alertRules: PatientAlertRule[] | null | undefined, triage: MergedAlertRules): number[] {
  const fromRules = feverMinsFromPatientRules(alertRules);
  if (fromRules.length) return fromRules;
  return [triage.fever_celsius_min];
}

function isFeverAboveAnyThresholdCelsius(
  t: number | null | undefined,
  mins: readonly number[]
): t is number {
  if (t == null) return false;
  const c = Number(t);
  if (!Number.isFinite(c)) return false;
  return mins.some((m) => c >= m);
}

/**
 * Só após a primeira carga: evita toasts por sintomas antigos; novos `symptom_logs` disparam.
 * Inscreve INSERT (Realtime) + acompanha `symptoms` após refetch. Beep opcional.
 */
export function useDossierFeverSound(
  patientId: string | undefined,
  alertRules: PatientAlertRule[] | null | undefined,
  triageRules: MergedAlertRules,
  symptoms: SymptomLogDetail[]
) {
  const [feverSoundEnabled, setFeverSoundEnabledState] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const seenSymptomIds = useRef<Set<string>>(new Set());
  const hasSeededSymptoms = useRef(false);
  const lastPatientId = useRef<string | undefined>(undefined);

  const feverCelsiusMins = useMemo(
    () => resolveFeverCelsiusMins(alertRules, triageRules),
    [alertRules, triageRules]
  );

  useEffect(() => {
    try {
      setFeverSoundEnabledState(() => localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* */
    }
  }, []);

  useEffect(() => {
    if (patientId !== lastPatientId.current) {
      lastPatientId.current = patientId;
      hasSeededSymptoms.current = false;
      seenSymptomIds.current = new Set();
    }
  }, [patientId]);

  const playBeepIfOn = useCallback(() => {
    if (!feverSoundEnabled) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = getOrCreateAudioContext();
    }
    const ctx = audioCtxRef.current;
    void ctx.resume().then(() => {
      playFeverBeepOnContext(ctx);
    });
  }, [feverSoundEnabled]);

  const minLabel = useMemo(
    () => (feverCelsiusMins.length ? Math.min(...feverCelsiusMins) : 37.8),
    [feverCelsiusMins]
  );

  const notifyFever = useCallback(
    (id: string, t: number) => {
      const m = minLabel;
      toast.warning("Febre registada (paciente)", {
        description: `Temperatura ${t.toFixed(1).replace(".", ",")}°C; limiar de alerta ≥ ${m.toFixed(1).replace(".", ",")}°C. Verifique a linha do tempo e sinais vitais.`,
        duration: 10_000,
        id: `dossier-fever-toast-${id}`,
      });
      playBeepIfOn();
    },
    [minLabel, playBeepIfOn]
  );

  const tryHandleNewFever = useCallback(
    (id: string | null | undefined, tRaw: string | number | null | undefined) => {
      if (!id || !patientId) return;
      if (seenSymptomIds.current.has(id)) return;
      const t = tRaw != null ? Number(tRaw) : Number.NaN;
      if (!isFeverAboveAnyThresholdCelsius(t, feverCelsiusMins)) return;
      seenSymptomIds.current.add(id);
      notifyFever(id, t);
    },
    [patientId, feverCelsiusMins, notifyFever]
  );

  useEffect(() => {
    if (patientId !== lastPatientId.current) return;
    if (!symptoms.length) {
      if (!hasSeededSymptoms.current) return;
      return;
    }
    if (!hasSeededSymptoms.current) {
      for (const s of symptoms) {
        seenSymptomIds.current.add(s.id);
      }
      hasSeededSymptoms.current = true;
      return;
    }
    for (const s of symptoms) {
      if (seenSymptomIds.current.has(s.id)) continue;
      seenSymptomIds.current.add(s.id);
      if (s.symptom_category === "fever" || s.body_temperature != null) {
        if (isFeverAboveAnyThresholdCelsius(s.body_temperature, feverCelsiusMins)) {
          const t = Number(s.body_temperature);
          notifyFever(s.id, t);
        }
      }
    }
  }, [symptoms, patientId, feverCelsiusMins, notifyFever]);

  const setFeverSoundEnabled = useCallback((next: boolean) => {
    if (next) {
      if (!audioCtxRef.current) {
        audioCtxRef.current = getOrCreateAudioContext();
      }
      void audioCtxRef.current.resume().then(() => {
        setFeverSoundEnabledState(true);
        try {
          localStorage.setItem(STORAGE_KEY, "1");
        } catch {
          /* */
        }
      });
    } else {
      setFeverSoundEnabledState(false);
      try {
        localStorage.setItem(STORAGE_KEY, "0");
      } catch {
        /* */
      }
    }
  }, []);

  /**
   * Stable ref so the subscription effect doesn't re-run every time
   * feverSoundEnabled changes (which would rebuild tryHandleNewFever through
   * the chain: feverSoundEnabled → playBeepIfOn → notifyFever → tryHandleNewFever).
   * Re-subscribing with the same channel name after subscribe() is already called
   * throws "cannot add postgres_changes callbacks after subscribe()".
   */
  const tryHandleNewFeverRef = useRef(tryHandleNewFever);
  useEffect(() => {
    tryHandleNewFeverRef.current = tryHandleNewFever;
  }, [tryHandleNewFever]);

  useEffect(() => {
    if (!patientId) return;
    if (!feverCelsiusMins.length) return;

    const ch = supabase
      .channel(
        `dossier_fever_realtime_${patientId}_${[...feverCelsiusMins]
          .sort((a, b) => a - b)
          .map((n) => n.toFixed(2))
          .join("_")}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "symptom_logs",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          const row = payload.new as { id?: string; body_temperature?: string | number | null };
          tryHandleNewFeverRef.current(row.id, row.body_temperature);
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
    // Only re-subscribe when the channel identity changes (patient or thresholds).
    // tryHandleNewFever is kept current via tryHandleNewFeverRef above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, feverCelsiusMins]);

  return { feverSoundEnabled, setFeverSoundEnabled, hasFeverRules: true as const };
}
