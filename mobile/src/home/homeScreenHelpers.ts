import type { ComponentProps } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";

export const MONTHS_SHORT = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

export function greetingLabel(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function formatDayMonth(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} de ${MONTHS_SHORT[d.getMonth()] ?? ""}`;
}

export function appointmentKindIcon(kind: string): ComponentProps<typeof FontAwesome>["name"] {
  if (kind === "exam") return "flask";
  if (kind === "infusion") return "hospital-o";
  if (kind === "consult") return "stethoscope";
  return "calendar";
}

export function appointmentKindShortLabel(kind: string): string {
  if (kind === "exam") return "Exame";
  if (kind === "consult") return "Consulta";
  if (kind === "infusion") return "Infusão (unidade)";
  return "Outro";
}

export function hrefForPinnedWidget(widgetId: string): Href | null {
  if (widgetId.startsWith("lab:")) return "/(tabs)/exams" as Href;
  if (widgetId.startsWith("symptom:")) return "/(tabs)/health/diary" as Href;
  if (widgetId.startsWith("nutrition:")) return "/(tabs)/health/nutrition" as Href;
  if (widgetId === "vital:steps") return "/(tabs)/health" as Href;
  if (widgetId === "vital:temp") return "/(tabs)/health/vitals/temperature" as Href;
  if (widgetId === "vital:hr") return "/(tabs)/health/vitals/heart_rate" as Href;
  if (widgetId === "vital:bp") return "/(tabs)/health/vitals/blood_pressure" as Href;
  if (widgetId === "vital:spo2") return "/(tabs)/health/vitals/spo2" as Href;
  if (widgetId === "vital:weight") return "/(tabs)/health/vitals/weight" as Href;
  if (widgetId === "vital:glucose") return "/(tabs)/health/vitals/glucose" as Href;
  if (widgetId.startsWith("vital:")) return "/(tabs)/health/vitals" as Href;
  return null;
}

export function medicationSlotKey(medId: string, when: Date): string {
  return `${medId}|${when.toISOString()}`;
}

export function sosMarkSlotKey(medId: string): string {
  return `${medId}|sos`;
}
