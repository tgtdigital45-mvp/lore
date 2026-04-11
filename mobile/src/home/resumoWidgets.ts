import { appStorage } from "@/src/lib/appStorage";

const STORAGE_KEY = "resumo_pinned_widget_ids_v1";

export type WidgetCategory = "exames" | "sintomas" | "sinais_vitais" | "atividade" | "nutricao";

export type WidgetDef = {
  id: string;
  label: string;
  category: WidgetCategory;
};

export const RESUMO_WIDGET_CATALOG: WidgetDef[] = [
  { id: "lab:plaquetas", label: "Plaquetas", category: "exames" },
  { id: "lab:hemoglobina", label: "Hemoglobina", category: "exames" },
  { id: "lab:leucocitos", label: "Leucócitos", category: "exames" },
  { id: "symptom:nausea", label: "Náusea", category: "sintomas" },
  { id: "symptom:diarrhea", label: "Diarreia", category: "sintomas" },
  { id: "symptom:pain", label: "Dor", category: "sintomas" },
  { id: "symptom:fever", label: "Febre", category: "sintomas" },
  { id: "vital:temp", label: "Temperatura", category: "sinais_vitais" },
  { id: "vital:steps", label: "Passos", category: "atividade" },
  { id: "nutrition:water", label: "Água", category: "nutricao" },
  { id: "nutrition:coffee", label: "Café", category: "nutricao" },
];

const DEFAULT_IDS = ["lab:plaquetas", "lab:hemoglobina", "symptom:nausea", "vital:temp", "vital:steps"];

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
