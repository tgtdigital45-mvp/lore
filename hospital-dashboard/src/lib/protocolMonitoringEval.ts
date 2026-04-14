import type { SupabaseClient } from "@supabase/supabase-js";
import type { MonitoringGuideline } from "@/types/protocolMonitoring";
import type {
  MedicationReferenceRow,
  ProtocolAlertRuleRow,
  ProtocolDayAnchorsRow,
  ProtocolGuidelineWindowRow,
  ProtocolMedicationWatchRow,
} from "../../../shared/protocolAlertAnchors";
import {
  anchorsFromRpc,
  evaluateAlertRules,
  filterGuidelineIdsByWindows,
  guidelineIdsFromMedicationWatches,
  type DayAnchors,
  type FiredAlert,
  type MetricSnapshot,
} from "../../../shared/protocolEvaluation";

export type { DayAnchors, FiredAlert };

async function fetchMetricSnapshot(client: SupabaseClient, patientId: string): Promise<MetricSnapshot> {
  const { data: tempRow } = await client
    .from("symptom_logs")
    .select("body_temperature, severity")
    .eq("patient_id", patientId)
    .not("body_temperature", "is", null)
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: plateRow } = await client
    .from("biomarker_logs")
    .select("value_numeric, name")
    .eq("patient_id", patientId)
    .ilike("name", "%plaquet%")
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: sevRow } = await client
    .from("symptom_logs")
    .select("severity")
    .eq("patient_id", patientId)
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const tr = tempRow as { body_temperature?: number | null } | null;
  const pr = plateRow as { value_numeric?: number | null } | null;
  const sr = sevRow as { severity?: string | null } | null;

  const sev = sr?.severity;
  const rankMap: Record<string, number> = { mild: 1, moderate: 2, severe: 3, life_threatening: 4 };

  return {
    lastTemperatureC: tr?.body_temperature != null ? Number(tr.body_temperature) : null,
    lastPlateletCount: pr?.value_numeric != null ? Number(pr.value_numeric) : null,
    lastSymptomSeverityRank: sev && rankMap[sev] != null ? rankMap[sev] : null,
  };
}

export async function loadProtocolMonitoringEvaluation(
  client: SupabaseClient,
  opts: {
    patientId: string;
    cycleId: string;
    protocolId: string;
    baseGuidelines: MonitoringGuideline[];
  }
): Promise<{
  anchors: DayAnchors;
  displayGuidelines: MonitoringGuideline[];
  firedAlerts: FiredAlert[];
} | null> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: anchorRows, error: e0 } = await client.rpc("compute_protocol_day_anchors", {
    p_cycle_id: opts.cycleId,
    p_on: today,
  });
  if (e0 || anchorRows == null) {
    console.warn("[loadProtocolMonitoringEvaluation] anchors", e0?.message);
    return null;
  }
  const row0 = (Array.isArray(anchorRows) ? anchorRows[0] : anchorRows) as ProtocolDayAnchorsRow | undefined;
  if (!row0) return null;

  const anchors = anchorsFromRpc(row0);

  const [{ data: windows, error: e1 }, { data: rules, error: e2 }, { data: watches, error: e3 }, { data: meds, error: e4 }] =
    await Promise.all([
      client
        .from("protocol_guideline_windows")
        .select("*")
        .eq("protocol_id", opts.protocolId),
      client
        .from("protocol_alert_rules")
        .select("*")
        .eq("protocol_id", opts.protocolId)
        .eq("enabled", true)
        .order("sort_order", { ascending: true }),
      client.from("protocol_medication_watch").select("*").eq("protocol_id", opts.protocolId),
      client
        .from("medications")
        .select("id, name, medication_reference_id")
        .eq("patient_id", opts.patientId)
        .eq("active", true),
    ]);

  if (e1) console.warn("[windows]", e1.message);
  if (e2) console.warn("[rules]", e2.message);
  if (e3) console.warn("[watches]", e3.message);
  if (e4) console.warn("[meds]", e4.message);

  const winRows = (windows ?? []) as ProtocolGuidelineWindowRow[];
  const ruleRows = (rules ?? []) as ProtocolAlertRuleRow[];
  const watchRows = (watches ?? []) as ProtocolMedicationWatchRow[];
  const medRows = (meds ?? []) as { id: string; name: string; medication_reference_id: string | null }[];

  const refIds = [...new Set(watchRows.map((w) => w.medication_reference_id))];
  let refs: MedicationReferenceRow[] = [];
  if (refIds.length > 0) {
    const { data: refData } = await client.from("medication_reference").select("*").in("id", refIds);
    refs = (refData ?? []) as MedicationReferenceRow[];
  }

  const allowedIds = filterGuidelineIdsByWindows(
    opts.baseGuidelines.map((g) => g.id),
    winRows,
    anchors
  );
  let display = opts.baseGuidelines.filter((g) => allowedIds.includes(g.id));

  const extraIdSet = guidelineIdsFromMedicationWatches(watchRows, refs, medRows);
  const missing = [...extraIdSet].filter((id) => !display.some((g) => g.id === id));
  if (missing.length > 0) {
    const { data: extraG } = await client.from("monitoring_guidelines").select("*").in("id", missing);
    const extras = (extraG ?? []) as MonitoringGuideline[];
    display = [...display, ...extras];
  }

  display.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const snap = await fetchMetricSnapshot(client, opts.patientId);
  const firedAlerts = evaluateAlertRules(ruleRows, anchors, snap);

  return { anchors, displayGuidelines: display, firedAlerts };
}
