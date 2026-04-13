import { Alert } from "react-native";
import { notifyEmergency } from "@/src/utils/notifications";
import { patientMessageForSemaphore } from "@/src/triage/SelfCareRecommendations";
import type { TriageSemaphore } from "@/src/triage/triageEngine";

export function presentTriageFeedback(
  raw: string | null | undefined,
  opts: {
    openSelfCare: () => void;
    openEmergency: (message: string) => void;
  }
): void {
  const sem = (raw ?? "green") as TriageSemaphore;
  if (sem === "green") {
    opts.openSelfCare();
    return;
  }
  if (sem === "yellow") {
    const msg = patientMessageForSemaphore("yellow");
    if (msg) Alert.alert("Acompanhamento", msg);
    return;
  }
  if (sem === "red") {
    const msg = patientMessageForSemaphore("red") ?? "Avaliação urgente recomendada.";
    opts.openEmergency(msg);
    void notifyEmergency("Alerta clínico", "Sintomas graves ou febre alta. Procure orientação médica ou o serviço de urgência se necessário.");
  }
}
