import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { sanitizeSupabaseError } from "@/lib/errorMessages";
import type { ClinicalTaskRow } from "@/types/dashboard";

export type TimelineEventRow = {
  id: string;
  patient_id: string;
  event_kind: string;
  event_at: string;
  title: string;
  description: string | null;
  severity: string | null;
  staff_id: string | null;
  linked_cycle_id: string | null;
  linked_document_id: string | null;
};

export type ClinicalNoteFeedRow = {
  id: string;
  note_text: string;
  note_type: string;
  is_private: boolean;
  created_at: string;
  author_name: string | null;
  author_role: string | null;
};

export type TumorEvaluationRow = {
  id: string;
  patient_id: string;
  cycle_id: string | null;
  evaluation_date: string;
  modality: string;
  /** Soma alvo (mm) — baseline implícito = primeira avaliação quando % não preenchido. */
  sum_lesions_mm: number | null;
  response_category: string | null;
  percent_change_from_baseline: number | null;
  notes: string | null;
};

export type ProQuestionnaireRow = {
  id: string;
  questionnaire_type: string;
  responses: Record<string, unknown>;
  total_score: number | null;
  domain_scores: Record<string, unknown> | null;
  filled_at: string;
  filled_by: string;
};

export type RiskScoreRow = {
  id: string;
  patient_id: string;
  probability: number | null;
  horizon_days: number | null;
  model_version: string | null;
  features_summary: Record<string, unknown> | null;
  computed_at?: string;
};

export function useDossierExtended(patientId: string | undefined, enabled: boolean) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEventRow[]>([]);
  const [notes, setNotes] = useState<ClinicalNoteFeedRow[]>([]);
  const [tumorEvals, setTumorEvals] = useState<TumorEvaluationRow[]>([]);
  const [proResponses, setProResponses] = useState<ProQuestionnaireRow[]>([]);
  const [riskScores, setRiskScores] = useState<RiskScoreRow[]>([]);
  const [tasks, setTasks] = useState<ClinicalTaskRow[]>([]);
  const [ctcaeMatrix, setCtcaeMatrix] = useState<unknown[]>([]);

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    try {
      const [
        tl,
        nRes,
        te,
        pro,
        rs,
        tk,
        rpcCtcae,
      ] = await Promise.all([
        supabase
          .from("clinical_timeline_events")
          .select("*")
          .eq("patient_id", patientId)
          .order("event_at", { ascending: false })
          .limit(80),
        supabase.rpc("get_clinical_notes", { p_patient_id: patientId, p_limit: 40 }),
        supabase.from("tumor_evaluations").select("*").eq("patient_id", patientId).order("evaluation_date", { ascending: true }),
        supabase.from("pro_questionnaire_responses").select("*").eq("patient_id", patientId).order("filled_at", { ascending: false }).limit(20),
        supabase.from("risk_scores").select("*").eq("patient_id", patientId).order("computed_at", { ascending: false }).limit(30),
        supabase
          .from("clinical_tasks")
          .select("id, hospital_id, patient_id, symptom_log_id, task_type, triage_semaphore, title, description, status, assigned_to, due_at, created_at, updated_at")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(40),
        supabase.rpc("get_ctcae_matrix", { p_patient_id: patientId }),
      ]);

      if (tl.error) throw tl.error;
      setTimeline((tl.data as TimelineEventRow[]) ?? []);

      if (nRes.error) throw nRes.error;
      setNotes((nRes.data as ClinicalNoteFeedRow[]) ?? []);

      if (te.error) throw te.error;
      setTumorEvals((te.data as TumorEvaluationRow[]) ?? []);

      if (pro.error) throw pro.error;
      setProResponses((pro.data as ProQuestionnaireRow[]) ?? []);

      if (rs.error) throw rs.error;
      setRiskScores((rs.data as RiskScoreRow[]) ?? []);

      if (tk.error) throw tk.error;
      setTasks((tk.data as ClinicalTaskRow[]) ?? []);

      if (!rpcCtcae.error && rpcCtcae.data != null) {
        const raw = rpcCtcae.data as unknown;
        if (Array.isArray(raw)) setCtcaeMatrix(raw);
        else if (typeof raw === "string") {
          try {
            const p = JSON.parse(raw) as unknown;
            setCtcaeMatrix(Array.isArray(p) ? p : []);
          } catch {
            setCtcaeMatrix([]);
          }
        } else setCtcaeMatrix([]);
      } else {
        setCtcaeMatrix([]);
      }
    } catch (e) {
      setError(sanitizeSupabaseError(e instanceof Error ? e : { message: String(e) }));
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (!patientId || !enabled) {
      setTimeline([]);
      setNotes([]);
      setTumorEvals([]);
      setProResponses([]);
      setRiskScores([]);
      setTasks([]);
      setCtcaeMatrix([]);
      return;
    }
    void load();
  }, [patientId, enabled, load]);

  return {
    loading,
    error,
    timeline,
    notes,
    tumorEvals,
    proResponses,
    riskScores,
    tasks,
    ctcaeMatrix,
    reload: load,
  };
}
