import type { Express, Request, RequestHandler, Response } from "express";
import type { RateLimitRequestHandler } from "express-rate-limit";
import { z } from "zod";
import type { Env } from "../../lib/config.js";
import { errorFields, logStructured } from "../../lib/logger.js";
import { processAgentMessage } from "./agentService.js";
import { handleOcrAnalyze, handleStaffOcrForPatient, OcrRejectedNotMedical } from "../../lib/ocrService.js";
import { runOpenAiSupport } from "../../lib/supportOpenAi.js";
import { idempotencyMiddleware } from "../../middleware/idempotencyMiddleware.js";

const processBody = z.object({
  message: z.string().min(1).max(8000),
});

const ocrMime = z.preprocess(
  (v) => (v === "image/jpg" ? "image/jpeg" : v),
  z.enum(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"])
);

const ocrBody = z.object({
  imageBase64: z.string().min(1).max(24_000_000),
  mimeType: ocrMime,
  documentType: z.enum(["blood_test", "biopsy", "scan"]).optional(),
});

const staffOcrBody = ocrBody.extend({
  patient_id: z.string().uuid(),
});

function logValidationError(route: string, err: z.ZodError) {
  logStructured("validation_error", { route, details: err.flatten() });
}

function normalizeOcrRequestBody(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const b = { ...(body as Record<string, unknown>) };
  if (b.mimeType === "image/jpg") b.mimeType = "image/jpeg";
  return b;
}

export type AiRiskRouteDeps = {
  ipAgentLimiter: RateLimitRequestHandler;
  userAgentLimiter: RateLimitRequestHandler;
  requireUser: RequestHandler;
};

/**
 * Support chat, agent, OCR, and vision-delegate compat routes.
 */
export function mountAiRiskRoutes(app: Express, env: Env, deps: AiRiskRouteDeps) {
  const { ipAgentLimiter, userAgentLimiter, requireUser } = deps;
  const idem = idempotencyMiddleware();

  app.post(
    "/api/support/chat",
    ipAgentLimiter,
    idem,
    requireUser,
    userAgentLimiter,
    async (req: Request, res: Response) => {
      const parsed = processBody.safeParse(req.body);
      if (!parsed.success) {
        logValidationError("support_chat", parsed.error);
        res.status(400).json({
          error: "invalid_request",
          message: "Requisição inválida. Verifique os campos enviados.",
        });
        return;
      }

      if (!env.OPENAI_API_KEY) {
        res.status(503).json({
          error: "support_unavailable",
          reply: "Suporte por chat não está configurado no servidor. Tente mais tarde.",
        });
        return;
      }

      try {
        const reply = await runOpenAiSupport(env, parsed.data.message);
        res.json({ reply });
      } catch (e) {
        logStructured("support_chat_failed", { err: errorFields(e) });
        res.status(500).json({
          error: "support_failed",
          reply: "Não foi possível obter resposta do suporte agora. Tente novamente em instantes.",
        });
      }
    }
  );

  app.post(
    "/api/agent/process",
    ipAgentLimiter,
    idem,
    requireUser,
    userAgentLimiter,
    async (req: Request, res: Response) => {
      const parsed = processBody.safeParse(req.body);
      if (!parsed.success) {
        logValidationError("agent_process", parsed.error);
        res.status(400).json({
          error: "invalid_request",
          message: "Requisição inválida. Verifique os campos enviados.",
        });
        return;
      }

      const au = req.authUser!;

      try {
        const result = await processAgentMessage(env, au.supabase, au.userId, parsed.data.message);
        res.json(result);
      } catch (e) {
        logStructured("agent_process_failed", { err: errorFields(e) });
        res.status(500).json({
          error: "agent_process_failed",
          reply:
            "Sistema temporariamente indisponível. Se precisar de ajuda clínica urgente, ligue para sua clínica ou procure o pronto-socorro.",
        });
      }
    }
  );

  app.post(
    "/api/ocr/analyze",
    ipAgentLimiter,
    idem,
    requireUser,
    userAgentLimiter,
    async (req: Request, res: Response) => {
      const parsed = ocrBody.safeParse(normalizeOcrRequestBody(req.body));
      if (!parsed.success) {
        logValidationError("ocr_analyze", parsed.error);
        res.status(400).json({
          error: "invalid_request",
          message: "Requisição inválida. Verifique os campos enviados.",
        });
        return;
      }

      const au = req.authUser!;

      try {
        const result = await handleOcrAnalyze(env, au.supabase, au.userId, parsed.data);
        res.json(result);
      } catch (e) {
        if (e instanceof OcrRejectedNotMedical) {
          res.status(422).json({
            error: "ocr_rejected_not_medical",
            message: e.message,
          });
          return;
        }
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === "patient_required") {
          res.status(400).json({
            error: "patient_required",
            message: "Complete o cadastro de paciente antes de enviar exames.",
          });
          return;
        }
        logStructured("ocr_analyze_failed", { err: errorFields(e) });
        res.status(500).json({
          error: "ocr_failed",
          message: "Não foi possível ler o exame agora. Tente foto mais nítida ou insira os valores manualmente.",
        });
      }
    }
  );

  app.post(
    "/api/staff/ocr/analyze",
    ipAgentLimiter,
    idem,
    requireUser,
    userAgentLimiter,
    async (req: Request, res: Response) => {
      const parsed = staffOcrBody.safeParse(normalizeOcrRequestBody(req.body));
      if (!parsed.success) {
        logValidationError("staff_ocr_analyze", parsed.error);
        res.status(400).json({
          error: "invalid_request",
          message: "Requisição inválida. Verifique os campos enviados.",
        });
        return;
      }

      const au = req.authUser!;

      try {
        const { patient_id, ...ocrInput } = parsed.data;
        const result = await handleStaffOcrForPatient(env, au.supabase, au.userId, patient_id, ocrInput);
        res.json(result);
      } catch (e) {
        if (e instanceof OcrRejectedNotMedical) {
          res.status(422).json({
            error: "ocr_rejected_not_medical",
            message: e.message,
          });
          return;
        }
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === "patient_not_found") {
          res.status(404).json({ error: "patient_not_found" });
          return;
        }
        if (msg === "forbidden") {
          res.status(403).json({ error: "forbidden" });
          return;
        }
        const pe = e as { code?: string; message?: string };
        if (pe.code === "42501" || (pe.message && pe.message.includes("row-level security"))) {
          logStructured("staff_ocr_rls_denied", { message: pe.message });
          res.status(403).json({
            error: "rls_denied",
            message: "Sem permissão para gravar neste paciente. Confirme lotação (staff_assignments) e migrações Sprint 6.",
          });
          return;
        }
        const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code?: string }).code) : "";
        logStructured("staff_ocr_failed", { code: code || "error", err: errorFields(e) });
        res.status(500).json({
          error: "ocr_failed",
          message: "Não foi possível processar o exame. Tente outra imagem ou PDF.",
        });
      }
    }
  );

  app.post(
    "/api/agent/vision-delegate",
    ipAgentLimiter,
    idem,
    requireUser,
    userAgentLimiter,
    async (_req: Request, res: Response) => {
      res.status(410).json({
        error: "use_ocr_endpoint",
        message: "Use POST /api/ocr/analyze com imageBase64 e mimeType (documentType opcional — a IA classifica se omitido).",
      });
    }
  );
}
