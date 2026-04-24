import type { Express, Request, Response } from "express";
import type { RateLimitRequestHandler } from "express-rate-limit";
import { z } from "zod";
import type { Env } from "./config.js";
import { authenticateBearer } from "./authMiddleware.js";
import { createServiceSupabase } from "./supabase.js";
import { logStructured } from "./logger.js";

const uuidParam = z.string().uuid();

const PrescriptionItemBodySchema = z.object({
  name: z.string().min(1),
  dosage: z.string().default(""),
  form: z.string().default(""),
  notes: z.string().default(""),
  posology: z.string().default(""),
  frequency_hours: z.coerce.number().int().min(1).max(168).default(24),
  duration_days: z.union([z.coerce.number().int().positive().max(3650), z.null()]).default(null),
  /** ISO 8601; if omitted, server uses today 08:00 (server local clock). */
  anchor_at: z.string().datetime().optional(),
});

const fromPrescriptionBody = z.object({
  items: z.array(PrescriptionItemBodySchema).min(1).max(20),
});

function defaultAnchorAtIso(): string {
  const d = new Date();
  d.setHours(8, 0, 0, 0);
  return d.toISOString();
}

function endDateFromDuration(anchorIso: string, durationDays: number | null): string | null {
  if (durationDays == null || durationDays < 1) return null;
  const anchor = new Date(anchorIso);
  if (Number.isNaN(anchor.getTime())) return null;
  const end = new Date(anchor);
  end.setDate(end.getDate() + durationDays);
  return end.toISOString().slice(0, 10);
}

function combineNotes(notes: string, posology: string): string | null {
  const p = posology?.trim() ?? "";
  const n = notes?.trim() ?? "";
  if (p && n) return `${p}\n\n${n}`;
  if (p) return p;
  if (n) return n;
  return null;
}

export function mountPrescriptionRoutes(
  app: Express,
  env: Env,
  ipLimiter: RateLimitRequestHandler,
  userLimiter: RateLimitRequestHandler
) {
  const auth = authenticateBearer(env);

  app.post(
    "/api/staff/patients/:patientId/medications/from-prescription",
    ipLimiter,
    auth,
    userLimiter,
    async (req: Request, res: Response) => {
      const paramParsed = uuidParam.safeParse(req.params.patientId);
      if (!paramParsed.success) {
        res.status(400).json({ error: "invalid_patient_id" });
        return;
      }
      const patientId = paramParsed.data;

      const bodyParsed = fromPrescriptionBody.safeParse(req.body);
      if (!bodyParsed.success) {
        res.status(400).json({ error: "invalid_request", details: bodyParsed.error.flatten() });
        return;
      }

      const service = createServiceSupabase(env);
      if (!service) {
        res.status(503).json({
          error: "service_role_unconfigured",
          message: "Servidor sem SUPABASE_SERVICE_ROLE_KEY; não é possível registar medicamentos em nome do paciente.",
        });
        return;
      }

      const au = req.authUser!;

      const { data: patient, error: pErr } = await au.supabase
        .from("patients")
        .select("id, hospital_id")
        .eq("id", patientId)
        .maybeSingle();
      if (pErr) {
        logStructured("from_prescription_patient_err", { err: pErr.message });
        res.status(500).json({ error: "db_error" });
        return;
      }
      if (!patient?.hospital_id) {
        res.status(404).json({ error: "patient_not_found" });
        return;
      }

      const { data: assign, error: aErr } = await au.supabase
        .from("staff_assignments")
        .select("id")
        .eq("staff_id", au.userId)
        .eq("hospital_id", patient.hospital_id)
        .maybeSingle();
      if (aErr) {
        logStructured("from_prescription_assign_err", { err: aErr.message });
        res.status(500).json({ error: "db_error" });
        return;
      }
      if (!assign) {
        res.status(403).json({ error: "forbidden" });
        return;
      }

      const { data: maxSortRow, error: sortErr } = await service
        .from("medications")
        .select("sort_order")
        .eq("patient_id", patientId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sortErr) {
        logStructured("from_prescription_sort_err", { err: sortErr.message });
        res.status(500).json({ error: "db_error" });
        return;
      }
      let nextSort = (maxSortRow?.sort_order ?? -1) + 1;

      const ids: string[] = [];

      for (const item of bodyParsed.data.items) {
        const anchorAt = item.anchor_at?.trim() || defaultAnchorAtIso();
        const endDate = endDateFromDuration(anchorAt, item.duration_days);
        const dosageText = [item.dosage?.trim(), item.form?.trim()].filter(Boolean).join(" · ") || null;

        const { data: row, error: insErr } = await service
          .from("medications")
          .insert({
            patient_id: patientId,
            name: item.name.trim(),
            dosage: dosageText,
            form: item.form?.trim() || null,
            frequency_hours: item.frequency_hours,
            anchor_at: anchorAt,
            end_date: endDate,
            active: true,
            archived: false,
            sort_order: nextSort,
            notes: combineNotes(item.notes, item.posology),
            repeat_mode: "interval_hours" as const,
            schedule_weekdays: null,
            unit: null,
            display_name: null,
            shape: null,
            color_left: null,
            color_right: null,
            color_bg: null,
          })
          .select("id")
          .single();

        if (insErr || !row) {
          logStructured("from_prescription_insert_failed", {
            patientId,
            err: insErr?.message,
          });
          res.status(500).json({
            error: "insert_failed",
            message: insErr?.message ?? "Falha ao inserir medicamento.",
            inserted: ids.length,
            ids,
          });
          return;
        }
        ids.push(row.id);
        nextSort += 1;
      }

      logStructured("from_prescription_ok", {
        patientId,
        staffId: au.userId,
        count: ids.length,
      });

      res.json({ inserted: ids.length, ids });
    }
  );
}
