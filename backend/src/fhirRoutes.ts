import type { Express, Request, Response } from "express";
import type { RateLimitRequestHandler } from "express-rate-limit";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "./config.js";
import { authenticateBearer } from "./authMiddleware.js";

async function staffMayAccessPatient(supabase: SupabaseClient, userId: string, patientId: string): Promise<boolean> {
  const { data: patientRow } = await supabase
    .from("patients")
    .select("hospital_id")
    .eq("id", patientId)
    .maybeSingle();
  const hid = (patientRow as { hospital_id?: string | null } | null)?.hospital_id;
  if (hid) {
    const { data: sa } = await supabase
      .from("staff_assignments")
      .select("id")
      .eq("staff_id", userId)
      .eq("hospital_id", hid)
      .maybeSingle();
    if (sa) return true;
  }
  const { data: links } = await supabase
    .from("patient_hospital_links")
    .select("hospital_id")
    .eq("patient_id", patientId)
    .eq("status", "approved");
  for (const row of links ?? []) {
    const h = (row as { hospital_id?: string }).hospital_id;
    if (!h) continue;
    const { data: sa2 } = await supabase
      .from("staff_assignments")
      .select("id")
      .eq("staff_id", userId)
      .eq("hospital_id", h)
      .maybeSingle();
    if (sa2) return true;
  }
  return false;
}

/** FHIR R4 mínimo para interoperabilidade (export). */
export function mountFhirRoutes(
  app: Express,
  env: Env,
  ipLimiter: RateLimitRequestHandler,
  userLimiter: RateLimitRequestHandler
) {
  const requireUser = authenticateBearer(env);

  app.get("/api/fhir/Patient/:patientId", ipLimiter, requireUser, userLimiter, async (req: Request, res: Response) => {
    const supabase = req.authUser!.supabase;
    const userId = req.authUser!.userId;
    const patientId = req.params.patientId;
    const { data: patientRow, error } = await supabase
      .from("patients")
      .select("id, hospital_id, primary_cancer_type, current_stage, profile_id, profiles!patients_profile_id_fkey ( full_name, date_of_birth )")
      .eq("id", patientId)
      .single();
    if (error || !patientRow) {
      res.status(404).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "not-found" }] });
      return;
    }
    const ok = await staffMayAccessPatient(supabase, userId, patientId);
    if (!ok) {
      res.status(403).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "forbidden" }] });
      return;
    }

    const prof = (patientRow as { profiles?: { full_name?: string; date_of_birth?: string } }).profiles;
    const name = Array.isArray(prof) ? prof[0] : prof;
    const resource = {
      resourceType: "Patient",
      id: patientId,
      identifier: [{ system: "urn:aura-onco:patient-id", value: patientId }],
      name: name?.full_name ? [{ text: name.full_name }] : undefined,
      birthDate: name?.date_of_birth?.slice(0, 10),
      extension: [
        {
          url: "urn:aura-onco:extension:cancer-type",
          valueString: (patientRow as { primary_cancer_type?: string }).primary_cancer_type,
        },
      ],
    };
    res.setHeader("Content-Type", "application/fhir+json");
    res.status(200).json(resource);
  });

  app.get("/api/fhir/Observation", ipLimiter, requireUser, userLimiter, async (req: Request, res: Response) => {
    const supabase = req.authUser!.supabase;
    const userId = req.authUser!.userId;
    const patientRef = typeof req.query["patient"] === "string" ? req.query["patient"] : "";
    const m = /^Patient\/(.+)$/.exec(patientRef);
    const patientId = m?.[1];
    if (!patientId) {
      res.status(400).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "invalid" }] });
      return;
    }
    const ok = await staffMayAccessPatient(supabase, userId, patientId);
    if (!ok) {
      res.status(403).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "forbidden" }] });
      return;
    }
    const { data: logs, error } = await supabase
      .from("symptom_logs")
      .select(
        "id, logged_at, entry_kind, pain_level, nausea_level, fatigue_level, severity, symptom_category, ae_max_grade, triage_semaphore"
      )
      .eq("patient_id", patientId)
      .order("logged_at", { ascending: false })
      .limit(100);
    if (error) {
      res.status(500).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "exception" }] });
      return;
    }
    const logList = (logs ?? []) as { id: string }[];
    const logIds = logList.map((l) => l.id).filter(Boolean);
    const { data: aeRows } =
      logIds.length > 0
        ? await supabase
            .from("symptom_ae_responses")
            .select("symptom_log_id, grade, ctcae_terms ( slug, label_pt, loinc_code, snomed_code )")
            .in("symptom_log_id", logIds)
        : { data: [] as unknown[] };

    type AeEmbed = {
      symptom_log_id: string;
      grade: number;
      ctcae_terms: { slug: string; label_pt: string; loinc_code: string | null; snomed_code: string | null } | null;
    };
    const byLog = new Map<string, AeEmbed[]>();
    for (const row of (aeRows ?? []) as AeEmbed[]) {
      const lid = row.symptom_log_id;
      const list = byLog.get(lid) ?? [];
      list.push(row);
      byLog.set(lid, list);
    }

    const entries: { fullUrl: string; resource: Record<string, unknown> }[] = [];
    let seq = 0;
    for (const L of logs ?? []) {
      const LR = L as Record<string, unknown>;
      const logId = String(LR.id ?? seq);
      const loggedAt = LR.logged_at as string;
      const entryKind = LR.entry_kind as string;
      const aeList = byLog.get(logId);

      if (entryKind === "ae_flow" && aeList?.length) {
        for (const ae of aeList) {
          const term = ae.ctcae_terms;
          const loinc = term?.loinc_code;
          const snomed = term?.snomed_code;
          const codeConcept =
            loinc != null && String(loinc).length > 0
              ? {
                  coding: [
                    { system: "http://loinc.org", code: String(loinc), display: term?.label_pt ?? undefined },
                    ...(snomed != null && String(snomed).length > 0
                      ? ([{ system: "http://snomed.info/sct", code: String(snomed) }] as const)
                      : []),
                  ],
                  text: term?.label_pt ?? "PRO-CTCAE / CTCAE",
                }
              : { text: term?.label_pt ?? "adverse-event-grade" };
          entries.push({
            fullUrl: `urn:uuid:obs-ae-${logId}-${seq++}`,
            resource: {
              resourceType: "Observation",
              id: `obs-ae-${logId}-${ae.grade}-${seq}`,
              status: "final",
              category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "survey" }] }],
              code: codeConcept,
              subject: { reference: `Patient/${patientId}` },
              effectiveDateTime: loggedAt,
              valueInteger: ae.grade,
            },
          });
        }
        continue;
      }

      const code =
        entryKind === "prd"
          ? "prd-panel"
          : entryKind === "ae_flow"
            ? "ae-flow-summary"
            : String(LR.symptom_category ?? "symptom");
      entries.push({
        fullUrl: `urn:uuid:obs-${logId}`,
        resource: {
          resourceType: "Observation",
          id: `obs-${logId}`,
          status: "final",
          category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "survey" }] }],
          code: { text: code },
          subject: { reference: `Patient/${patientId}` },
          effectiveDateTime: loggedAt,
          ...(entryKind === "prd"
            ? {
                component: [
                  {
                    code: { coding: [{ system: "http://loinc.org", code: "75347-8", display: "Pain severity" }] },
                    valueQuantity: { value: LR.pain_level as number, unit: "score", system: "http://unitsofmeasure.org", code: "{score}" },
                  },
                  {
                    code: { coding: [{ system: "http://loinc.org", code: "64794-8", display: "Nausea" }] },
                    valueQuantity: { value: LR.nausea_level as number, unit: "score", system: "http://unitsofmeasure.org", code: "{score}" },
                  },
                  {
                    code: { coding: [{ system: "http://loinc.org", code: "64750-2", display: "Fatigue" }] },
                    valueQuantity: { value: LR.fatigue_level as number, unit: "score", system: "http://unitsofmeasure.org", code: "{score}" },
                  },
                ],
              }
            : entryKind === "ae_flow"
              ? {
                  valueInteger: LR.ae_max_grade as number,
                  code: {
                    coding: [{ system: "http://loinc.org", code: "72133-2", display: "CTCAE grade" }],
                    text: "CTCAE max grade (ePROM)",
                  },
                }
              : {
                  valueString: `severity:${LR.severity ?? "—"}`,
                }),
        },
      });
    }
    const bundle = {
      resourceType: "Bundle",
      type: "searchset",
      total: entries.length,
      entry: entries,
    };
    res.setHeader("Content-Type", "application/fhir+json");
    res.status(200).json(bundle);
  });
}
