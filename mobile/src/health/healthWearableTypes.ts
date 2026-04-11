export type HealthWearableMetric =
  | "heart_rate"
  | "oxygen_saturation"
  | "hrv_sdnn"
  | "falls_count"
  | "walking_steadiness_event";

export type HealthWearableRowInsert = {
  patient_id: string;
  source: "apple_health";
  metric: HealthWearableMetric;
  value_numeric: number | null;
  unit: string | null;
  observed_start: string;
  observed_end: string | null;
  apple_sample_uuid: string;
  metadata: Record<string, unknown>;
};
