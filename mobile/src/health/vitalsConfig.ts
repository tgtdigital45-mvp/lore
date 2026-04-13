import type { VitalType } from "@/src/types/vitalsNutrition";

/** Limiar clínico orientativo para aviso de febre (°C). */
export const FEVER_THRESHOLD_C = 37.8;

/** Ordem no hub e nas abas do detalhe. */
export const VITAL_HUB_ORDER: VitalType[] = [
  "temperature",
  "heart_rate",
  "blood_pressure",
  "glucose",
  "spo2",
  "weight",
];

export const VITAL_HUB_META: Record<
  VitalType,
  { title: string; subtitle: string; icon: string; accent: "vitals" | "respiratory" | "treatment" }
> = {
  temperature: {
    title: "Temperatura",
    subtitle: "°C · oral ou axilar",
    icon: "fire",
    accent: "vitals",
  },
  heart_rate: {
    title: "Frequência cardíaca",
    subtitle: "bpm",
    icon: "heartbeat",
    accent: "vitals",
  },
  blood_pressure: {
    title: "Pressão arterial",
    subtitle: "mmHg",
    icon: "heart",
    accent: "vitals",
  },
  glucose: {
    title: "Glicemia",
    subtitle: "mg/dL",
    icon: "medkit",
    accent: "respiratory",
  },
  spo2: {
    title: "Saturação (SpO₂)",
    subtitle: "%",
    icon: "tint",
    accent: "respiratory",
  },
  weight: {
    title: "Peso",
    subtitle: "kg",
    icon: "sort-numeric-asc",
    accent: "treatment",
  },
};

export const VITAL_TAB_SHORT: Record<VitalType, string> = {
  temperature: "Temp.",
  heart_rate: "FC",
  blood_pressure: "PA",
  glucose: "Glic.",
  spo2: "SpO₂",
  weight: "Peso",
};

export function isVitalType(s: string | undefined): s is VitalType {
  return (
    s === "temperature" ||
    s === "heart_rate" ||
    s === "blood_pressure" ||
    s === "spo2" ||
    s === "weight" ||
    s === "glucose"
  );
}
