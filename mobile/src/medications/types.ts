export type MedicationShapeId =
  | "capsule_h"
  | "tablet_round"
  | "tablet_oval"
  | "tablet_oblong"
  | "liquid_bottle"
  | "pill_bottle"
  | "measuring_cup"
  | "tube"
  | "diamond"
  | "diamond_wide"
  | "triangle"
  | "kidney"
  | "rounded_square"
  | "rounded_rect"
  | "trapezoid"
  | "pentagon";

export type DraftFrequency = "daily" | "weekdays" | "interval_hours" | "as_needed";

export type ScheduleItem = {
  clientId: string;
  hours: number;
  minutes: number;
  quantity: number;
};

export type MedicationDraft = {
  name: string;
  form: string | null;
  dosageAmount: string | null;
  unit: string | null;
  shapeId: MedicationShapeId | null;
  colorLeft: string;
  colorRight: string;
  colorBg: string;
  schedules: ScheduleItem[];
  frequency: DraftFrequency;
  /** 0–6 Sun–Sat when frequency === weekdays */
  weekdays: number[] | null;
  /** when frequency === interval_hours */
  intervalHours: number | null;
  startDate: Date;
  endDate: Date | null;
  displayName: string | null;
  notes: string | null;
};

export function createEmptyDraft(): MedicationDraft {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return {
    name: "",
    form: null,
    dosageAmount: null,
    unit: "mg",
    shapeId: null,
    colorLeft: "#FF3B30",
    colorRight: "#FFADB0",
    colorBg: "#007AFF",
    schedules: [],
    frequency: "daily",
    weekdays: null,
    intervalHours: 8,
    startDate: new Date(),
    endDate: null,
    displayName: null,
    notes: null,
  };
}
