import type { TriageSemaphore } from "@/src/triage/triageEngine";

const GREEN_TIPS = [
  "Hidrate-se regularmente ao longo do dia.",
  "Descanse em intervalos curtos se sentir cansaço leve.",
  "Continue a registar sintomas — ajuda a equipa a acompanhar o tratamento.",
];

const YELLOW_PATIENT_MSG =
  "Os seus sintomas foram classificados como moderados. A equipa de enfermagem foi notificada para acompanhamento nas próximas 24 horas.";

const RED_PATIENT_MSG =
  "Os seus sintomas exigem avaliação urgente. Contacte o seu médico assistente ou dirija-se ao serviço de urgência se piorar rapidamente.";

export function selfCareTipsForGreen(): readonly string[] {
  return GREEN_TIPS;
}

export function patientMessageForSemaphore(s: TriageSemaphore): string | null {
  if (s === "yellow") return YELLOW_PATIENT_MSG;
  if (s === "red") return RED_PATIENT_MSG;
  return null;
}
