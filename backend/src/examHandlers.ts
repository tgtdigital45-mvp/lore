import type { Express, Request, Response } from "express";
import type { RateLimitRequestHandler } from "express-rate-limit";
import { z } from "zod";
import type { Env } from "./config.js";
import { authenticateBearer } from "./authMiddleware.js";
import { deleteExamObject, extFromMime, getExamObjectBuffer, isR2Configured, presignGetExamObject } from "./r2.js";
import { createUserSupabase } from "./supabase.js";
import { errorFields, logStructured } from "./logger.js";

const uuidParam = z.string().uuid();

async function getOwnedDocument(
  supabase: ReturnType<typeof createUserSupabase>,
  userId: string,
  examId: string
) {
  const { data: doc, error } = await supabase
    .from("medical_documents")
    .select("id, patient_id, storage_path, mime_type, uploaded_at")
    .eq("id", examId)
    .maybeSingle();
  if (error || !doc) return { error: "not_found" as const };
  const { data: pat } = await supabase
    .from("patients")
    .select("id")
    .eq("id", doc.patient_id)
    .eq("profile_id", userId)
    .maybeSingle();
  if (!pat) return { error: "forbidden" as const };
  return { doc };
}

/** Equipe hospitalar: mesmo documento, com lotação no hospital do paciente. */
async function getStaffDocument(
  supabase: ReturnType<typeof createUserSupabase>,
  staffUserId: string,
  examId: string
) {
  const { data: doc, error } = await supabase
    .from("medical_documents")
    .select("id, patient_id, storage_path, mime_type, uploaded_at")
    .eq("id", examId)
    .maybeSingle();
  if (error || !doc) return { error: "not_found" as const };

  const { data: patient } = await supabase
    .from("patients")
    .select("hospital_id")
    .eq("id", doc.patient_id)
    .maybeSingle();
  if (!patient?.hospital_id) return { error: "forbidden" as const };

  const { data: assign } = await supabase
    .from("staff_assignments")
    .select("id")
    .eq("staff_id", staffUserId)
    .eq("hospital_id", patient.hospital_id)
    .maybeSingle();
  if (!assign) return { error: "forbidden" as const };

  return { doc };
}

export function mountExamRoutes(
  app: Express,
  env: Env,
  ipLimiter: RateLimitRequestHandler,
  userLimiter: RateLimitRequestHandler
) {
  const auth = authenticateBearer(env);

  app.get("/api/staff/exams/:id/view", ipLimiter, auth, userLimiter, async (req: Request, res: Response) => {
    const parsed = uuidParam.safeParse(req.params.id);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_id" });
      return;
    }
    const au = req.authUser!;

    const access = await getStaffDocument(au.supabase, au.userId, parsed.data);
    if ("error" in access) {
      res.status(access.error === "not_found" ? 404 : 403).json({ error: access.error });
      return;
    }
    const { doc } = access;

    if (!isR2Configured(env)) {
      res.status(503).json({
        error: "storage_unconfigured",
        message: "Armazenamento R2 não configurado no servidor.",
      });
      return;
    }
    if (doc.storage_path.startsWith("inline-ocr/")) {
      res.status(404).json({
        error: "no_file",
        message: "Este registo não tem ficheiro associado no armazenamento.",
      });
      return;
    }

    try {
      const url = await presignGetExamObject(env, doc.storage_path, 15 * 60);
      logStructured("staff_exam_presign_ok", {
        documentId: doc.id,
        patientId: doc.patient_id,
        staffUserId: au.userId,
      });
      res.json({ url, mimeType: doc.mime_type ?? "application/octet-stream", expiresInSeconds: 15 * 60 });
    } catch (e) {
      logStructured("staff_exam_presign_failed", {
        documentId: doc.id,
        err: e instanceof Error ? e.message : String(e),
      });
      res.status(500).json({ error: "presign_failed" });
    }
  });

  /** Download com Content-Disposition: attachment (evita abrir PDF noutro domínio em vez de gravar). */
  app.get("/api/staff/exams/:id/download", ipLimiter, auth, userLimiter, async (req: Request, res: Response) => {
    const parsed = uuidParam.safeParse(req.params.id);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_id" });
      return;
    }
    const au = req.authUser!;

    const access = await getStaffDocument(au.supabase, au.userId, parsed.data);
    if ("error" in access) {
      res.status(access.error === "not_found" ? 404 : 403).json({ error: access.error });
      return;
    }
    const { doc } = access;

    if (!isR2Configured(env)) {
      res.status(503).json({
        error: "storage_unconfigured",
        message: "Armazenamento R2 não configurado no servidor.",
      });
      return;
    }
    if (doc.storage_path.startsWith("inline-ocr/")) {
      res.status(404).json({
        error: "no_file",
        message: "Este registo não tem ficheiro associado no armazenamento.",
      });
      return;
    }

    try {
      const { body, contentType: ctFromR2 } = await getExamObjectBuffer(env, doc.storage_path);
      const mime = ctFromR2 || doc.mime_type || "application/octet-stream";
      const ext = extFromMime(mime);
      const safeBase = `exame-${doc.id.slice(0, 8)}`;
      const filename = `${safeBase}.${ext}`;
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(body);
    } catch (e) {
      logStructured("staff_exam_download_failed", {
        documentId: doc.id,
        err: e instanceof Error ? e.message : String(e),
      });
      res.status(500).json({ error: "download_failed" });
    }
  });

  app.get("/api/exams/:id/view", ipLimiter, auth, userLimiter, async (req: Request, res: Response) => {
    const parsed = uuidParam.safeParse(req.params.id);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_id" });
      return;
    }
    const au = req.authUser!;

    const owned = await getOwnedDocument(au.supabase, au.userId, parsed.data);
    if ("error" in owned) {
      res.status(owned.error === "not_found" ? 404 : 403).json({ error: owned.error });
      return;
    }
    const { doc } = owned;

    if (!isR2Configured(env)) {
      res.status(503).json({
        error: "storage_unconfigured",
        message: "Armazenamento R2 não configurado no servidor.",
      });
      return;
    }
    if (doc.storage_path.startsWith("inline-ocr/")) {
      res.status(404).json({
        error: "no_file",
        message: "Este registo não tem ficheiro associado no armazenamento.",
      });
      return;
    }

    try {
      const url = await presignGetExamObject(env, doc.storage_path, 15 * 60);
      res.json({ url, mimeType: doc.mime_type ?? "application/octet-stream", expiresInSeconds: 15 * 60 });
    } catch (e) {
      logStructured("patient_exam_presign_failed", { err: errorFields(e) });
      res.status(500).json({ error: "presign_failed" });
    }
  });

  app.get("/api/exams/:id/share", ipLimiter, auth, userLimiter, async (req: Request, res: Response) => {
    const parsed = uuidParam.safeParse(req.params.id);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_id" });
      return;
    }
    const au = req.authUser!;

    const owned = await getOwnedDocument(au.supabase, au.userId, parsed.data);
    if ("error" in owned) {
      res.status(owned.error === "not_found" ? 404 : 403).json({ error: owned.error });
      return;
    }
    const { doc } = owned;

    if (!isR2Configured(env)) {
      res.status(503).json({
        error: "storage_unconfigured",
        message: "Armazenamento R2 não configurado no servidor.",
      });
      return;
    }
    if (doc.storage_path.startsWith("inline-ocr/")) {
      res.status(404).json({
        error: "no_file",
        message: "Este registo não tem ficheiro associado no armazenamento.",
      });
      return;
    }

    const sevenDays = 7 * 24 * 60 * 60;
    try {
      const url = await presignGetExamObject(env, doc.storage_path, sevenDays);
      res.json({ url, mimeType: doc.mime_type ?? "application/octet-stream", expiresInSeconds: sevenDays });
    } catch (e) {
      logStructured("patient_exam_share_presign_failed", { err: errorFields(e) });
      res.status(500).json({ error: "presign_failed" });
    }
  });

  app.delete("/api/exams/:id", ipLimiter, auth, userLimiter, async (req: Request, res: Response) => {
    const parsed = uuidParam.safeParse(req.params.id);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_id" });
      return;
    }
    const au = req.authUser!;

    const owned = await getOwnedDocument(au.supabase, au.userId, parsed.data);
    if ("error" in owned) {
      res.status(owned.error === "not_found" ? 404 : 403).json({ error: owned.error });
      return;
    }
    const { doc } = owned;
    const storagePath = doc.storage_path;
    const shouldDeleteR2 = isR2Configured(env) && !storagePath.startsWith("inline-ocr/");

    const { error: delErr } = await au.supabase.from("medical_documents").delete().eq("id", doc.id);
    if (delErr) {
      logStructured("exam_db_delete_failed", { documentId: doc.id, err: delErr.message });
      res.status(500).json({ error: "db_delete_failed" });
      return;
    }

    if (shouldDeleteR2) {
      try {
        await deleteExamObject(env, storagePath);
      } catch (e) {
        logStructured("exam_r2_delete_failed_after_db", {
          documentId: doc.id,
          storagePath,
          err: errorFields(e),
        });
        logStructured("exam_r2_delete_stderr", { documentId: doc.id, err: errorFields(e) });
      }
    }

    res.json({ ok: true });
  });
}
