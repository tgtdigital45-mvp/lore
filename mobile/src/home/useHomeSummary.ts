import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { fetchHomeSummarySnapshot } from "@/src/home/fetchHomeSummarySnapshot";
import {
  type BiomarkerLatest,
  type HomeSummarySnapshot,
  type NextAppointmentSnippet,
  snapshotToMaps,
  type SymptomSnippet,
} from "@/src/home/homeSummaryTypes";
import {
  getWidgetLabel,
  normalizeBiomarkerKey,
  biomarkerSlugFromWidgetId,
  vitalTypeFromWidgetId,
} from "@/src/home/resumoWidgets";
import type { PatientRow } from "@/src/hooks/usePatient";
import { labelSeverity, labelSymptomCategory } from "@/src/i18n/ui";
import type { TreatmentCycleRow } from "@/src/types/treatment";
import type { NutritionLogRow, VitalLogRow, VitalType } from "@/src/types/vitalsNutrition";

export type { TreatmentCycleRow, BiomarkerLatest, SymptomSnippet, NextAppointmentSnippet };

export const homeSummaryQueryKey = (patientId: string | undefined) => ["homeSummary", patientId ?? "none"] as const;

function sameLocalCalendarDay(iso: string): boolean {
  const a = new Date(iso);
  const b = new Date();
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildNutritionAgg(rows: NutritionLogRow[]) {
  let waterToday = 0;
  let coffeeToday = 0;
  let mealCountToday = 0;
  let caloriesToday = 0;
  let lastMealName: string | null = null;
  let latestAppetite: { level: number; logged_at: string } | null = null;

  for (const r of rows) {
    if (!sameLocalCalendarDay(r.logged_at)) continue;
    if (r.log_type === "water" && r.quantity != null) waterToday += r.quantity;
    if (r.log_type === "coffee" && r.quantity != null) coffeeToday += r.quantity;
    if (r.log_type === "meal") {
      mealCountToday += 1;
      if (r.meal_name) lastMealName = r.meal_name;
      if (r.calories != null) caloriesToday += r.calories;
    }
    if (r.log_type === "calories" && r.calories != null) caloriesToday += r.calories;
    if (r.log_type === "appetite" && r.appetite_level != null) {
      if (!latestAppetite || new Date(r.logged_at) > new Date(latestAppetite.logged_at)) {
        latestAppetite = { level: r.appetite_level, logged_at: r.logged_at };
      }
    }
  }

  return { waterToday, coffeeToday, mealCountToday, caloriesToday, lastMealName, latestAppetite };
}

export function useHomeSummary(patient: PatientRow | null) {
  const queryClient = useQueryClient();
  const patientId = patient?.id;

  const query = useQuery({
    queryKey: homeSummaryQueryKey(patientId),
    enabled: Boolean(patientId),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (!patient) throw new Error("Paciente não disponível");
      return fetchHomeSummarySnapshot(patient);
    },
  });

  const data = query.data;
  const maps = useMemo(() => (data ? snapshotToMaps(data) : null), [data]);

  const nutritionAgg = useMemo(() => buildNutritionAgg(data?.nutritionRows ?? []), [data?.nutritionRows]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: homeSummaryQueryKey(patientId) });
  }, [queryClient, patientId]);

  const resolveLabWidget = useCallback(
    (slug: string, biomarkerByNorm: Map<string, BiomarkerLatest>): BiomarkerLatest | null => {
      const n = normalizeBiomarkerKey(slug);
      const direct = biomarkerByNorm.get(n);
      if (direct) return direct;
      const slugSynonyms: Record<string, string[]> = {
        leucocitos: ["wbc", "leuco", "gb"],
        hemoglobina: ["hgb", "hb"],
        plaquetas: ["plt", "platelet"],
      };
      for (const syn of slugSynonyms[slug] ?? []) {
        const bySyn = biomarkerByNorm.get(syn);
        if (bySyn) return bySyn;
      }
      for (const [, v] of biomarkerByNorm) {
        const nn = normalizeBiomarkerKey(v.name);
        if (nn.includes(n) || n.includes(nn)) return v;
      }
      for (const syn of slugSynonyms[slug] ?? []) {
        for (const [, v] of biomarkerByNorm) {
          const nn = normalizeBiomarkerKey(v.name);
          if (nn.includes(syn)) return v;
        }
      }
      return null;
    },
    []
  );

  const formatVitalWidget = useCallback(
    (
      widgetId: string,
      latestVitalByType: Map<VitalType, VitalLogRow>,
      lastBySymptom: Map<string, SymptomSnippet>
    ): { title: string; subtitle: string; hint?: string } => {
      const vt = vitalTypeFromWidgetId(widgetId);
      if (!vt) return { title: getWidgetLabel(widgetId), subtitle: "—" };
      if (vt === "temperature") {
        const row = latestVitalByType.get("temperature");
        if (row?.value_numeric != null) {
          return { title: "Temperatura", subtitle: `${row.value_numeric} °C` };
        }
        const fever = lastBySymptom.get("fever");
        if (fever?.body_temperature != null) {
          return { title: "Temperatura", subtitle: `${fever.body_temperature} °C`, hint: "Último registro no diário" };
        }
        return { title: "Temperatura", subtitle: "Sem registro", hint: "Registre em Saúde → Sinais vitais" };
      }
      const row = latestVitalByType.get(vt);
      if (!row) return { title: getWidgetLabel(widgetId), subtitle: "Sem registro", hint: "Registre em Saúde → Sinais vitais" };
      if (vt === "blood_pressure") {
        const sys = row.value_systolic;
        const dia = row.value_diastolic;
        if (sys != null && dia != null) {
          return { title: "Pressão", subtitle: `${sys}/${dia} mmHg` };
        }
        return { title: "Pressão", subtitle: "Sem registro" };
      }
      if (row.value_numeric == null) return { title: getWidgetLabel(widgetId), subtitle: "—" };
      const u = row.unit ? ` ${row.unit}` : "";
      return { title: getWidgetLabel(widgetId), subtitle: `${row.value_numeric}${u}` };
    },
    []
  );

  const formatWidgetValue = useCallback(
    (widgetId: string): { title: string; subtitle: string; hint?: string } => {
      if (!maps) return { title: "", subtitle: "—" };
      const { biomarkerByNorm, lastBySymptom, latestVitalByType } = maps;
      const def = widgetId;
      if (def.startsWith("lab:")) {
        const slug = biomarkerSlugFromWidgetId(widgetId);
        if (!slug) return { title: getWidgetLabel(widgetId), subtitle: "—" };
        const row = resolveLabWidget(slug, biomarkerByNorm);
        if (!row) return { title: getWidgetLabel(widgetId), subtitle: "Sem registro" };
        const u = row.unit ? ` ${row.unit}` : "";
        return { title: row.name, subtitle: `${row.value}${u}` };
      }
      if (def.startsWith("symptom:")) {
        const cat = def.slice("symptom:".length);
        const row = lastBySymptom.get(cat);
        if (!row) return { title: labelSymptomCategory(cat), subtitle: "Sem registro" };
        if (row.entry_kind === "prd" && cat === "nausea" && row.nausea_level != null) {
          return { title: labelSymptomCategory(cat), subtitle: `Náusea ${row.nausea_level}/10` };
        }
        if (row.entry_kind === "prd" && cat === "fever" && row.body_temperature != null) {
          return { title: labelSymptomCategory(cat), subtitle: `${row.body_temperature} °C` };
        }
        const sub =
          row.entry_kind === "prd"
            ? `Dor ${row.pain_level ?? "—"}/10`
            : labelSeverity(row.severity ?? "mild");
        return { title: labelSymptomCategory(cat), subtitle: sub };
      }
      if (def === "vital:steps") {
        return { title: "Passos", subtitle: "Sem registro", hint: "Sincronize atividade em Saúde" };
      }
      if (def.startsWith("vital:")) {
        return formatVitalWidget(def, latestVitalByType, lastBySymptom);
      }
      if (def === "nutrition:water") {
        if (nutritionAgg.waterToday > 0) {
          return { title: "Água", subtitle: `${nutritionAgg.waterToday} copo(s) hoje` };
        }
        return { title: "Água", subtitle: "Sem registro", hint: "Registre em Saúde → Nutrição" };
      }
      if (def === "nutrition:coffee") {
        if (nutritionAgg.coffeeToday > 0) {
          return { title: "Café", subtitle: `${nutritionAgg.coffeeToday} hoje` };
        }
        return { title: "Café", subtitle: "Sem registro", hint: "Registre em Saúde → Nutrição" };
      }
      if (def === "nutrition:meals") {
        if (nutritionAgg.mealCountToday > 0) {
          return {
            title: "Refeições",
            subtitle: `${nutritionAgg.mealCountToday} hoje`,
            hint: nutritionAgg.lastMealName ?? undefined,
          };
        }
        return { title: "Refeições", subtitle: "Nenhuma hoje" };
      }
      if (def === "nutrition:calories") {
        if (nutritionAgg.caloriesToday > 0) {
          return { title: "Calorias", subtitle: `${nutritionAgg.caloriesToday} kcal hoje` };
        }
        return { title: "Calorias", subtitle: "Sem registro" };
      }
      if (def === "nutrition:appetite") {
        if (nutritionAgg.latestAppetite) {
          return { title: "Apetite", subtitle: `${nutritionAgg.latestAppetite.level}/10` };
        }
        return { title: "Apetite", subtitle: "Sem registro" };
      }
      return { title: "", subtitle: "—" };
    },
    [maps, nutritionAgg, resolveLabWidget, formatVitalWidget]
  );

  const emptySnapshot = useMemo((): HomeSummarySnapshot => {
    return {
      profileName: "",
      profileAvatarUrl: null,
      activeCycle: null,
      biomarkerByNormEntries: [],
      lastBySymptomEntries: [],
      latestVitalByTypeEntries: [],
      nutritionRows: [],
      hasBiopsy: false,
      lastDoc: null,
      latestSymptom: null,
      nextAppointment: null,
    };
  }, []);

  const snapshot = patientId && data ? data : emptySnapshot;
  const { biomarkerByNorm, lastBySymptom, latestVitalByType } = useMemo(
    () => snapshotToMaps(snapshot),
    [snapshot]
  );

  return {
    profileName: snapshot.profileName,
    profileAvatarUrl: snapshot.profileAvatarUrl,
    /** Primeira carga (sem dados em cache). */
    loading: Boolean(patientId) ? query.isPending : false,
    /** Inclui refetch após invalidação ou foco. */
    isFetching: Boolean(patientId) ? query.isFetching : false,
    isError: query.isError,
    error: query.error instanceof Error ? query.error : query.error != null ? new Error(String(query.error)) : null,
    activeCycle: snapshot.activeCycle,
    biomarkerByNorm,
    lastBySymptom,
    hasBiopsy: snapshot.hasBiopsy,
    lastDoc: snapshot.lastDoc,
    latestSymptom: snapshot.latestSymptom,
    nextAppointment: snapshot.nextAppointment,
    refresh,
    formatWidgetValue,
  };
}
