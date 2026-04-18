import type { Href } from "expo-router";
import { appStorage } from "@/src/lib/appStorage";

const STORAGE_KEY = "resumo_pinned_category_shortcuts_v1";

export type CategoryShortcutId =
  | "treatment"
  | "medications"
  | "vitals"
  | "nutrition"
  | "exams"
  | "symptoms"
  | "calendar";

export type CategoryShortcutDef = {
  id: CategoryShortcutId;
  label: string;
  href: Href;
  icon: "circle-o" | "medkit" | "heartbeat" | "cutlery" | "file-text-o" | "book" | "calendar";
};

export const CATEGORY_SHORTCUT_CATALOG: CategoryShortcutDef[] = [
  { id: "treatment", label: "Tratamento", href: "/(tabs)/health/treatment" as Href, icon: "circle-o" },
  { id: "medications", label: "Medicamentos", href: "/(tabs)/health/medications" as Href, icon: "medkit" },
  { id: "vitals", label: "Sinais vitais", href: "/(tabs)/health/vitals" as Href, icon: "heartbeat" },
  { id: "nutrition", label: "Nutrição", href: "/(tabs)/health/nutrition" as Href, icon: "cutlery" },
  { id: "exams", label: "Exames", href: "/(tabs)/exams" as Href, icon: "file-text-o" },
  { id: "symptoms", label: "Sintomas", href: "/(tabs)/health/diary" as Href, icon: "book" },
  { id: "calendar", label: "Agendamentos", href: "/calendar" as Href, icon: "calendar" },
];

const VALID = new Set<string>(CATEGORY_SHORTCUT_CATALOG.map((c) => c.id));

export function categoryShortcutDef(id: string): CategoryShortcutDef | undefined {
  return CATEGORY_SHORTCUT_CATALOG.find((c) => c.id === id);
}

export async function loadPinnedCategoryIds(): Promise<CategoryShortcutId[]> {
  try {
    const raw = await appStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is CategoryShortcutId => typeof x === "string" && VALID.has(x));
  } catch {
    return [];
  }
}

export async function savePinnedCategoryIds(ids: CategoryShortcutId[]): Promise<void> {
  const seen = new Set<CategoryShortcutId>();
  const dedup: CategoryShortcutId[] = [];
  for (const id of ids) {
    if (VALID.has(id) && !seen.has(id)) {
      seen.add(id);
      dedup.push(id);
    }
  }
  await appStorage.setItem(STORAGE_KEY, JSON.stringify(dedup));
}

export async function togglePinnedCategory(id: CategoryShortcutId): Promise<CategoryShortcutId[]> {
  const cur = await loadPinnedCategoryIds();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  await savePinnedCategoryIds(next);
  return next;
}
