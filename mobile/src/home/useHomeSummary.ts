import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { canonicalBiomarkerName } from "@/src/exams/biomarkerCanonical";
import { getWidgetLabel, normalizeBiomarkerKey, biomarkerSlugFromWidgetId } from "@/src/home/resumoWidgets";
import type { PatientRow } from "@/src/hooks/usePatient";
import { labelSeverity, labelSymptomCategory } from "@/src/i18n/ui";

export type TreatmentCycleRow = {
  id: string;
  protocol_name: string;
  start_date: string;
  end_date: string | null;
  status: string;
};

export type BiomarkerLatest = { name: string; value: string; unit: string | null; logged_at: string };

export type SymptomSnippet = {
  id: string;
  symptom_category: string;
  severity: string;
  body_temperature: number | null;
  logged_at: string;
};

export function useHomeSummary(patient: PatientRow | null) {
  const [profileName, setProfileName] = useState<string>("");
  const [activeCycle, setActiveCycle] = useState<TreatmentCycleRow | null>(null);
  const [biomarkerByNorm, setBiomarkerByNorm] = useState<Map<string, BiomarkerLatest>>(new Map());
  const [lastBySymptom, setLastBySymptom] = useState<Map<string, SymptomSnippet>>(new Map());
  const [hasBiopsy, setHasBiopsy] = useState(false);
  const [lastDoc, setLastDoc] = useState<{ document_type: string; uploaded_at: string } | null>(null);
  const [latestSymptom, setLatestSymptom] = useState<SymptomSnippet | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!patient) {
      setProfileName("");
      setActiveCycle(null);
      setBiomarkerByNorm(new Map());
      setLastBySymptom(new Map());
      setHasBiopsy(false);
      setLastDoc(null);
      setLatestSymptom(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (uid) {
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle();
      setProfileName(typeof prof?.full_name === "string" ? prof.full_name : "");
    }

    const [{ data: cycles }, { data: bioRows }, { data: symRows }, { data: bioDoc }, { data: anyDoc }] = await Promise.all([
      supabase
        .from("treatment_cycles")
        .select("id, protocol_name, start_date, end_date, status")
        .eq("patient_id", patient.id)
        .eq("status", "active")
        .order("start_date", { ascending: false })
        .limit(1),
      supabase.from("biomarker_logs").select("name, value_numeric, value_text, unit, logged_at").eq("patient_id", patient.id).order("logged_at", { ascending: false }).limit(400),
      supabase.from("symptom_logs").select("id, symptom_category, severity, body_temperature, logged_at").eq("patient_id", patient.id).order("logged_at", { ascending: false }).limit(200),
      supabase.from("medical_documents").select("id").eq("patient_id", patient.id).eq("document_type", "biopsy").limit(1),
      supabase.from("medical_documents").select("document_type, uploaded_at").eq("patient_id", patient.id).order("uploaded_at", { ascending: false }).limit(1),
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
        if (!symMap.has(r.symptom_category)) symMap.set(r.symptom_category, r);
      }
    }
    setLastBySymptom(symMap);
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
      return { title: labelSymptomCategory(cat), subtitle: labelSeverity(row.severity) };
    }
    if (def === "vital:temp") {
      const fever = lastBySymptom.get("fever");
      if (fever?.body_temperature != null) {
        return { title: "Temperatura", subtitle: `${fever.body_temperature} °C` };
      }
      return { title: "Temperatura", subtitle: "Sem registro" };
    }
    if (def === "vital:steps") {
      return { title: "Passos", subtitle: "Sem registro", hint: "Sincronize atividade em Saúde" };
    }
    if (def === "nutrition:water") {
      return { title: "Água", subtitle: "Sem registro", hint: "Registro em breve" };
    }
    if (def === "nutrition:coffee") {
      return { title: "Café", subtitle: "Sem registro", hint: "Registro em breve" };
    }
    return { title: "", subtitle: "—" };
  }

  return {
    profileName,
    loading,
    activeCycle,
    biomarkerByNorm,
    lastBySymptom,
    hasBiopsy,
    lastDoc,
    latestSymptom,
    refresh,
    formatWidgetValue,
  };
}
