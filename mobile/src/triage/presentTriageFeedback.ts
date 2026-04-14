import { Alert } from "react-native";
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
    // Routine log, no modal needed per user request to streamline flow
    return;
  }
  if (sem === "yellow") {
    const msg = patientMessageForSemaphore("yellow");
    if (msg) Alert.alert("Acompanhamento", msg);
    return;
  }
  if (sem === "red") {
    const msg = patientMessageForSemaphore("red") ?? "Registre a evolução dos sintomas.";
    opts.openEmergency(msg);
  }
}
