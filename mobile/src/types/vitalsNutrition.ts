export type VitalType = "temperature" | "heart_rate" | "blood_pressure" | "spo2" | "weight" | "glucose";

export type VitalLogRow = {
  id: string;
  patient_id: string;
  logged_at: string;
  vital_type: VitalType;
  value_numeric: number | null;
  value_systolic: number | null;
  value_diastolic: number | null;
  unit: string | null;
  notes: string | null;
  created_at: string;
};

export type NutritionLogType = "water" | "coffee" | "meal" | "calories" | "appetite";

export type NutritionLogRow = {
  id: string;
  patient_id: string;
  logged_at: string;
  log_type: NutritionLogType;
  quantity: number | null;
  meal_name: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  appetite_level: number | null;
  notes: string | null;
  created_at: string;
};
