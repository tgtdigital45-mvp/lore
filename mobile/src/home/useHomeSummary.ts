import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { canonicalBiomarkerName } from "@/src/exams/biomarkerCanonical";
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

export type { TreatmentCycleRow };

export type BiomarkerLatest = { name: string; value: string; unit: string | null; logged_at: string };

export type SymptomSnippet = {
  id: string;
  entry_kind?: string;
  symptom_category: string | null;
  severity: string | null;
  pain_level?: number | null;
  nausea_level?: number | null;
  fatigue_level?: number | null;
  body_temperature: number | null;
  logged_at: string;
};

export type NextAppointmentSnippet = {
  title: string;
  starts_at: string;
  kind: "consult" | "exam" | "other";
};

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
  const [profileName, setProfileName] = useState<string>("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [activeCycle, setActiveCycle] = useState<TreatmentCycleRow | null>(null);
  const [biomarkerByNorm, setBiomarkerByNorm] = useState<Map<string, BiomarkerLatest>>(new Map());
  const [lastBySymptom, setLastBySymptom] = useState<Map<string, SymptomSnippet>>(new Map());
  const [latestVitalByType, setLatestVitalByType] = useState<Map<VitalType, VitalLogRow>>(new Map());
  const [nutritionRows, setNutritionRows] = useState<NutritionLogRow[]>([]);
  const [hasBiopsy, setHasBiopsy] = useState(false);
  const [lastDoc, setLastDoc] = useState<{ document_type: string; uploaded_at: string } | null>(null);
  const [latestSymptom, setLatestSymptom] = useState<SymptomSnippet | null>(null);
  const [nextAppointment, setNextAppointment] = useState<NextAppointmentSnippet | null>(null);
  const [loading, setLoading] = useState(true);

  const nutritionAgg = useMemo(() => buildNutritionAgg(nutritionRows), [nutritionRows]);

  const refresh = useCallback(async () => {
    if (!patient) {
      setProfileName("");
      setProfileAvatarUrl(null);
      setActiveCycle(null);
      setBiomarkerByNorm(new Map());
      setLastBySymptom(new Map());
      setLatestVitalByType(new Map());
      setNutritionRows([]);
      setHasBiopsy(false);
      setLastDoc(null);
      setLatestSymptom(null);
      setNextAppointment(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (uid) {
      const { data: prof } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", uid).maybeSingle();
      setProfileName(typeof prof?.full_name === "string" ? prof.full_name : "");
      const au = prof && typeof (prof as { avatar_url?: unknown }).avatar_url === "string" ? (prof as { avatar_url: string }).avatar_url : null;
      setProfileAvatarUrl(au);
    }

    const nowIso = new Date().toISOString();
    const [
      { data: cycles },
      { data: bioRows },
      { data: symRows },
      { data: bioDoc },
      { data: anyDoc },
      { data: vitalRows },
      { data: nutrRows },
      { data: apptRows },
    ] = await Promise.all([
      supabase
        .from("treatment_cycles")
        .select(
          "id, protocol_name, start_date, end_date, status, treatment_kind, notes, planned_sessions, completed_sessions, last_session_at, last_weight_kg, infusion_interval_days"
        )
        .eq("patient_id", patient.id)
        .eq("status", "active")
        .order("start_date", { ascending: false })
        .limit(1),
      supabase
        .from("biomarker_logs")
        .select("name, value_numeric, value_text, unit, logged_at")
        .eq("patient_id", patient.id)
        .order("logged_at", { ascending: false })
        .limit(400),
      supabase
        .from("symptom_logs")
        .select(
          "id, entry_kind, symptom_category, severity, pain_level, nausea_level, fatigue_level, body_temperature, logged_at"
        )
        .eq("patient_id", patient.id)
        .order("logged_at", { ascending: false })
        .limit(200),
      supabase.from("medical_documents").select("id").eq("patient_id", patient.id).eq("document_type", "biopsy").limit(1),
      supabase.from("medical_documents").select("document_type, uploaded_at").eq("patient_id", patient.id).order("uploaded_at", { ascending: false }).limit(1),
      supabase.from("vital_logs").select("*").eq("patient_id", patient.id).order("logged_at", { ascending: false }).limit(300),
      supabase.from("nutrition_logs").select("*").eq("patient_id", patient.id).order("logged_at", { ascending: false }).limit(500),
      supabase
        .from("patient_appointments")
        .select("title, kind, starts_at")
        .eq("patient_id", patient.id)
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(24),
    ]);

    setActiveCycle((Array.isArray(cycles) && cycles[0] ? cycles[0] : null) as TreatmentCycleRow | null);
    setHasBiopsy(!!(bioDoc && bioDoc.length > 0));
    setLastDoc(anyDoc && anyDoc[0] ? (anyDoc[0] as { document_type: string; uploaded_at: string }) : null);

    if (symRows && symRows[0]) {
      setLatestSymptom(symRows[0] as SymptomSnippet);
    } else {
      setLatestSymptom(null);
    }

    const bioMap = new Map<string, BiomarkerLatest>();
    if (bioRows) {
      for (const r of bioRows as {
        name: string;
        value_numeric: number | null;
        value_text: string | null;
        unit: string | null;
        logged_at: string;
      }[]) {
        const canon = canonicalBiomarkerName(r.name);
        const key = normalizeBiomarkerKey(canon);
        if (bioMap.has(key)) continue;
        let display = "";
        if (r.value_numeric != null && Number.isFinite(Number(r.value_numeric))) {
          display = String(r.value_numeric);
        } else if (r.value_text != null && String(r.value_text).trim() !== "") {
          display = String(r.value_text).trim();
        } else {
          continue;
        }
        bioMap.set(key, { name: canon, value: display, unit: r.unit, logged_at: r.logged_at });
      }
    }
    setBiomarkerByNorm(bioMap);

    const symMap = new Map<string, SymptomSnippet>();
    if (symRows) {
      for (const r of symRows as SymptomSnippet[]) {
        const cat = r.symptom_category;
        if (cat && !symMap.has(cat)) symMap.set(cat, r);
      }
    }
    setLastBySymptom(symMap);

    const vitalMap = new Map<VitalType, VitalLogRow>();
    if (vitalRows) {
      for (const r of vitalRows as VitalLogRow[]) {
        const t = r.vital_type;
        if (!vitalMap.has(t)) vitalMap.set(t, r);
      }
    }
    setLatestVitalByType(vitalMap);

    setNutritionRows((nutrRows ?? []) as NutritionLogRow[]);

    const upcoming = (apptRows ?? []) as { title: string; kind: string; starts_at: string }[];
    const exam = upcoming.find((r) => r.kind === "exam");
    const pick = exam ?? upcoming[0];
    if (pick && (pick.kind === "consult" || pick.kind === "exam" || pick.kind === "other")) {
      setNextAppointment({ title: pick.title, starts_at: pick.starts_at, kind: pick.kind });
    } else {
      setNextAppointment(null);
    }

    setLoading(false);
  }, [patient]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function resolveLabWidget(slug: string): BiomarkerLatest | null {
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
  }

  function formatVitalWidget(widgetId: string): { title: string; subtitle: string; hint?: string } {
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
  }

  function formatWidgetValue(widgetId: string): { title: string; subtitle: string; hint?: string } {
    const def = widgetId;
    if (def.startsWith("lab:")) {
      const slug = biomarkerSlugFromWidgetId(widgetId);
      if (!slug) return { title: getWidgetLabel(widgetId), subtitle: "—" };
      const row = resolveLabWidget(slug);
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
      return formatVitalWidget(def);
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
  }

  return {
    profileName,
    profileAvatarUrl,
    loading,
    activeCycle,
    biomarkerByNorm,
    lastBySymptom,
    hasBiopsy,
    lastDoc,
    latestSymptom,
    nextAppointment,
    refresh,
    formatWidgetValue,
  };
}
