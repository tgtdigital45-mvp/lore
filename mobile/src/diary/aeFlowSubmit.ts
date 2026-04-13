import { supabase } from "@/src/lib/supabase";
import type { PromFlowResult } from "@/src/diary/promFlows/types";
import { loggedByProfileIdForInsert } from "@/src/lib/actorProfile";

export async function submitAeFlowLog(opts: {
  patientId: string;
  result: PromFlowResult;
  attachmentStoragePath?: string | null;
}): Promise<{ triage_semaphore: string | null; logId: string } | { error: string }> {
  const flowContext = {
    flowId: opts.result.flowId,
    answers: opts.result.answers,
    termGrades: opts.result.termGrades,
  };

  const actor = await loggedByProfileIdForInsert();

  const { data: ins, error: insErr } = await supabase
    .from("symptom_logs")
    .insert({
      patient_id: opts.patientId,
      entry_kind: "ae_flow",
      symptom_category: null,
      severity: null,
      ae_max_grade: opts.result.aeMaxGrade,
      flow_context: flowContext,
      notes: null,
      logged_at: new Date().toISOString(),
      attachment_storage_path: opts.attachmentStoragePath ?? null,
      logged_by_profile_id: actor ?? null,
    })
    .select("id, triage_semaphore")
    .single();

  if (insErr || !ins) {
    return { error: insErr?.message ?? "insert_failed" };
  }

  const logId = (ins as { id: string }).id;
  const slugs = [...new Set(opts.result.termGrades.map((t) => t.slug))];
  const { data: terms, error: termErr } = await supabase.from("ctcae_terms").select("id, slug").in("slug", slugs);

  if (termErr || !terms?.length) {
    return { error: termErr?.message ?? "ctcae_terms" };
  }

  const bySlug = new Map(terms.map((r: { id: string; slug: string }) => [r.slug, r.id] as const));
  const rows = opts.result.termGrades
    .map((tg) => {
      const tid = bySlug.get(tg.slug);
      if (!tid) return null;
      return {
        symptom_log_id: logId,
        ctcae_term_id: tid,
        grade: tg.grade,
        raw_answers: { flow: opts.result.flowId, answers: opts.result.answers },
      };
    })
    .filter(Boolean) as {
    symptom_log_id: string;
    ctcae_term_id: string;
    grade: number;
    raw_answers: Record<string, unknown>;
  }[];

  if (rows.length > 0) {
    const { error: rErr } = await supabase.from("symptom_ae_responses").insert(rows);
    if (rErr) {
      return { error: rErr.message };
    }
  }

  return {
    triage_semaphore: (ins as { triage_semaphore?: string | null }).triage_semaphore ?? null,
    logId,
  };
}

export async function startFeverWatchEpisode(opts: {
  patientId: string;
  sourceSymptomLogId: string;
}): Promise<{ error?: string }> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const { error } = await supabase.from("monitoring_episodes").insert({
    patient_id: opts.patientId,
    kind: "fever_watch",
    source_symptom_log_id: opts.sourceSymptomLogId,
    next_prompt_at: tomorrow.toISOString(),
    metadata: { cadence: "daily" },
  });
  if (error) return { error: error.message };
  return {};
}
