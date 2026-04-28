import { useCallback, useEffect, useRef, useState } from "react";
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

// Tipos mantidos para compatibilidade com componentes existentes.
// As queries correspondentes foram removidas do hook por não serem consumidas
// em nenhuma aba do dossier atualmente.
export type TumorEvaluationRow = {
  id: string;
  patient_id: string;
  cycle_id: string | null;
  evaluation_date: string;
  modality: string;
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

/**
 * Seções disponíveis para carregamento sob demanda.
 *
 * - "notes"    — notas clínicas (tab "resumo", carregada automaticamente no mount)
 * - "timeline" — linha do tempo (tab "linha_tempo")
 * - "tasks"    — tarefas (tab "tarefas")
 * - "ctcae"    — matriz CTCAE (tab "toxicidade")
 *
 * As seções são carregadas apenas uma vez por patientId.
 * Não carregar dados que nenhuma aba consome (tumor_evals, pro, risk_scores
 * eram buscados mas nunca renderizados — removidos para reduzir requests).
 */
export type DossierSection = "notes" | "timeline" | "tasks" | "ctcae";

export function useDossierExtended(patientId: string | undefined, enabled: boolean) {
  // Rastreia quais seções já foram carregadas para este patientId
  const loadedRef = useRef<Set<DossierSection>>(new Set());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEventRow[]>([]);
  const [notes, setNotes] = useState<ClinicalNoteFeedRow[]>([]);
  const [tasks, setTasks] = useState<ClinicalTaskRow[]>([]);
  const [ctcaeMatrix, setCtcaeMatrix] = useState<unknown[]>([]);

  const fetchSection = useCallback(
    async (section: DossierSection): Promise<void> => {
      if (!patientId) return;
      switch (section) {
        case "notes": {
          const res = await supabase.rpc("get_clinical_notes", {
            p_patient_id: patientId,
            p_limit: 40,
          });
          if (res.error) throw res.error;
          setNotes((res.data as ClinicalNoteFeedRow[]) ?? []);
          break;
        }
        case "timeline": {
          const res = await supabase
            .from("clinical_timeline_events")
            .select("*")
            .eq("patient_id", patientId)
            .order("event_at", { ascending: false })
            .limit(80);
          if (res.error) throw res.error;
          setTimeline((res.data as TimelineEventRow[]) ?? []);
          break;
        }
        case "tasks": {
          const res = await supabase
            .from("clinical_tasks")
            .select(
              "id, hospital_id, patient_id, symptom_log_id, task_type, triage_semaphore, title, description, status, assigned_to, due_at, created_at, updated_at"
            )
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false })
            .limit(40);
          if (res.error) throw res.error;
          setTasks((res.data as ClinicalTaskRow[]) ?? []);
          break;
        }
        case "ctcae": {
          const res = await supabase.rpc("get_ctcae_matrix", {
            p_patient_id: patientId,
          });
          if (res.error || res.data == null) {
            setCtcaeMatrix([]);
            break;
          }
          const raw = res.data as unknown;
          if (Array.isArray(raw)) {
            setCtcaeMatrix(raw);
          } else if (typeof raw === "string") {
            try {
              const parsed = JSON.parse(raw) as unknown;
              setCtcaeMatrix(Array.isArray(parsed) ? parsed : []);
            } catch {
              setCtcaeMatrix([]);
            }
          } else {
            setCtcaeMatrix([]);
          }
          break;
        }
      }
    },
    [patientId]
  );

  /**
   * Carrega uma seção sob demanda. Idempotente: chamadas repetidas para a mesma
   * seção são ignoradas (a seção já foi carregada).
   */
  const loadSection = useCallback(
    async (section: DossierSection): Promise<void> => {
      if (!patientId || !enabled) return;
      if (loadedRef.current.has(section)) return;
      loadedRef.current.add(section);
      setLoading(true);
      try {
        await fetchSection(section);
      } catch (e) {
        loadedRef.current.delete(section); // permite retry
        setError(sanitizeSupabaseError(e instanceof Error ? e : { message: String(e) }));
      } finally {
        setLoading(false);
      }
    },
    [patientId, enabled, fetchSection]
  );

  // Limpa estado e carrega apenas as notas ao montar/trocar paciente.
  // As demais seções são carregadas por tab via loadSection().
  useEffect(() => {
    if (!patientId || !enabled) {
      loadedRef.current.clear();
      setTimeline([]);
      setNotes([]);
      setTasks([]);
      setCtcaeMatrix([]);
      setError(null);
      return;
    }
    void loadSection("notes");
  }, [patientId, enabled, loadSection]);

  /**
   * Re-carrega todas as seções que já foram abertas pelo usuário.
   */
  const reload = useCallback(async (): Promise<void> => {
    if (!patientId) return;
    const sections = [...loadedRef.current] as DossierSection[];
    loadedRef.current.clear();
    setLoading(true);
    try {
      await Promise.all(
        sections.map((s) => {
          loadedRef.current.add(s);
          return fetchSection(s);
        })
      );
    } catch (e) {
      setError(sanitizeSupabaseError(e instanceof Error ? e : { message: String(e) }));
    } finally {
      setLoading(false);
    }
  }, [patientId, fetchSection]);

  return {
    loading,
    error,
    timeline,
    notes,
    tasks,
    ctcaeMatrix,
    reload,
    loadSection,
  };
}
