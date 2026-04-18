import { SYMPTOM_NAV_ITEMS } from "@/src/diary/symptomCatalog";
import { appStorage } from "@/src/lib/appStorage";
import type { VitalType } from "@/src/types/vitalsNutrition";

const STORAGE_KEY = "resumo_pinned_widget_ids_v1";

export type WidgetCategory = "exames" | "sintomas" | "sinais_vitais" | "atividade" | "nutricao";

/** Ordem fixa das seções no seletor de métricas (evita ordem aleatória do Map). */
export const RESUMO_WIDGET_CATEGORY_ORDER: WidgetCategory[] = [
  "exames",
  "sintomas",
  "sinais_vitais",
  "atividade",
  "nutricao",
];

export type WidgetDef = {
  id: string;
  label: string;
  category: WidgetCategory;
};

/** Biomarcadores alinhados a `canonicalBiomarkerName` (exames / hemograma e química sanguínea). */
const LAB_WIDGET_DEFS: WidgetDef[] = [
  { id: "lab:plaquetas", label: "Plaquetas", category: "exames" },
  { id: "lab:hemoglobina", label: "Hemoglobina", category: "exames" },
  { id: "lab:leucocitos", label: "Leucócitos", category: "exames" },
  { id: "lab:hematocrito", label: "Hematócrito", category: "exames" },
  { id: "lab:vcm", label: "VCM", category: "exames" },
  { id: "lab:hcm", label: "HCM", category: "exames" },
  { id: "lab:chcm", label: "CHCM", category: "exames" },
  { id: "lab:neutrofilos", label: "Neutrófilos", category: "exames" },
  { id: "lab:linfocitos", label: "Linfócitos", category: "exames" },
  { id: "lab:monocitos", label: "Monócitos", category: "exames" },
  { id: "lab:eosinofilos", label: "Eosinófilos", category: "exames" },
  { id: "lab:basofilos", label: "Basófilos", category: "exames" },
  { id: "lab:ferritina", label: "Ferritina", category: "exames" },
  { id: "lab:ferro_serico", label: "Ferro sérico", category: "exames" },
  { id: "lab:creatinina", label: "Creatinina", category: "exames" },
  { id: "lab:ureia", label: "Ureia", category: "exames" },
];

const SYMPTOM_WIDGETS: WidgetDef[] = SYMPTOM_NAV_ITEMS.map((s) => ({
  id: `symptom:${s.id}`,
  label: s.label,
  category: "sintomas" as const,
}));

const OTHER_WIDGETS: WidgetDef[] = [
  { id: "vital:temp", label: "Temperatura", category: "sinais_vitais" },
  { id: "vital:hr", label: "Freq. cardíaca", category: "sinais_vitais" },
  { id: "vital:bp", label: "Pressão arterial", category: "sinais_vitais" },
  { id: "vital:spo2", label: "SpO2", category: "sinais_vitais" },
  { id: "vital:weight", label: "Peso", category: "sinais_vitais" },
  { id: "vital:glucose", label: "Glicemia", category: "sinais_vitais" },
  { id: "vital:steps", label: "Passos", category: "atividade" },
  { id: "nutrition:water", label: "Água", category: "nutricao" },
  { id: "nutrition:coffee", label: "Café", category: "nutricao" },
  { id: "nutrition:meals", label: "Refeições", category: "nutricao" },
  { id: "nutrition:calories", label: "Calorias", category: "nutricao" },
  { id: "nutrition:appetite", label: "Apetite", category: "nutricao" },
];

export const RESUMO_WIDGET_CATALOG: WidgetDef[] = [...LAB_WIDGET_DEFS, ...SYMPTOM_WIDGETS, ...OTHER_WIDGETS];

const DEFAULT_IDS = [
  "lab:plaquetas",
  "lab:hemoglobina",
  "symptom:nausea",
  "vital:temp",
  "vital:hr",
  "nutrition:water",
];

/** Maps widget id vital:* to DB vital_type (except vital:steps — activity placeholder). */
export function vitalTypeFromWidgetId(id: string): VitalType | null {
  const m: Record<string, VitalType> = {
    "vital:temp": "temperature",
    "vital:hr": "heart_rate",
    "vital:bp": "blood_pressure",
    "vital:spo2": "spo2",
    "vital:weight": "weight",
    "vital:glucose": "glucose",
  };
  return m[id] ?? null;
}

export function normalizeBiomarkerKey(name: string): string {
  return name.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

export function biomarkerSlugFromWidgetId(id: string): string | null {
  if (!id.startsWith("lab:")) return null;
  return id.slice(4);
}

export async function loadPinnedWidgetIds(): Promise<string[]> {
  try {
    const raw = await appStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_IDS];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_IDS];
    const ids = parsed.filter((x): x is string => typeof x === "string");
    const valid = new Set(RESUMO_WIDGET_CATALOG.map((w) => w.id));
    const kept = ids.filter((id) => valid.has(id));
    return kept.length > 0 ? kept : [...DEFAULT_IDS];
  } catch {
    return [...DEFAULT_IDS];
  }
}

export async function savePinnedWidgetIds(ids: string[]): Promise<void> {
  const valid = new Set(RESUMO_WIDGET_CATALOG.map((w) => w.id));
  const next = ids.filter((id) => valid.has(id));
  await appStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export const AVATAR_STORAGE_KEY = "profile_local_avatar_uri_v1";

export function getWidgetLabel(id: string): string {
  return RESUMO_WIDGET_CATALOG.find((w) => w.id === id)?.label ?? id;
}
