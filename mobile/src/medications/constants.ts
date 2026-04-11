import type { MedicationShapeId } from "@/src/medications/types";

export const DOSAGE_UNITS = ["mg", "mcg", "g", "mL", "UI", "gotas"] as const;
export type DosageUnit = (typeof DOSAGE_UNITS)[number];

/** Capsule halves + background — Apple Health–style palette */
export const PILL_HALVES_COLORS = [
  "#FFFFFF",
  "#C7C7CC",
  "#FFD60A",
  "#FF9500",
  "#FFADB0",
  "#34C759",
  "#5AC8FA",
  "#007AFF",
  "#AF52DE",
  "#FF3B30",
  "#FF6482",
  "#FF7F50",
] as const;

export const PILL_BACKGROUND_COLORS = [
  "#007AFF",
  "#3A3A3C",
  "#FFD60A",
  "#FF9F0A",
  "#8E8E93",
  "#34C759",
  "#5AC8FA",
] as const;

export type ShapeDef = {
  id: MedicationShapeId;
  label: string;
  section: "common" | "more";
};

export const MEDICATION_SHAPES: ShapeDef[] = [
  { id: "capsule_h", label: "Cápsula", section: "common" },
  { id: "tablet_round", label: "Comprimido redondo", section: "common" },
  { id: "tablet_oval", label: "Comprimido oval", section: "common" },
  { id: "tablet_oblong", label: "Comprimido oblongo", section: "common" },
  { id: "liquid_bottle", label: "Frasco", section: "common" },
  { id: "pill_bottle", label: "Frasco de comprimidos", section: "common" },
  { id: "measuring_cup", label: "Copo medidor", section: "common" },
  { id: "tube", label: "Bisnaga", section: "common" },
  { id: "diamond", label: "Losango", section: "more" },
  { id: "diamond_wide", label: "Losango largo", section: "more" },
  { id: "triangle", label: "Triangular", section: "more" },
  { id: "kidney", label: "Rim", section: "more" },
  { id: "rounded_square", label: "Quadrado arredondado", section: "more" },
  { id: "rounded_rect", label: "Retangular", section: "more" },
  { id: "trapezoid", label: "Trapézio", section: "more" },
  { id: "pentagon", label: "Pentágono", section: "more" },
];

export const INTERVAL_HOUR_OPTIONS = [6, 8, 12, 24] as const;
