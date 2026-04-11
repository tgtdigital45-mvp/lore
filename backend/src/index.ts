import cors from "cors";
import express, { type Request } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { z } from "zod";
import { loadEnv } from "./config.js";
import { logStructured } from "./logger.js";
import { processAgentMessage } from "./agentService.js";
import { handleOcrAnalyze, handleStaffOcrForPatient, OcrRejectedNotMedical } from "./ocrService.js";
import { runOpenAiSupport } from "./supportOpenAi.js";
import { mountExamRoutes } from "./examHandlers.js";
import { isR2Configured } from "./r2.js";
import { mountWhatsappRoutes } from "./whatsappRoutes.js";
import { authenticateBearer } from "./authMiddleware.js";
import { idempotencyMiddleware } from "./idempotencyMiddleware.js";

const env = loadEnv();
const requireUser = authenticateBearer(env);
const app = express();
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const isProd = process.env.NODE_ENV === "production";
const corsOrigins = env.CORS_ORIGINS?.split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin:
      corsOrigins && corsOrigins.length > 0
        ? (origin, cb) => {
            if (!origin) {
              cb(null, true);
              return;
            }
            if (corsOrigins.includes(origin)) {
              cb(null, true);
              return;
            }
            cb(null, false);
          }
        : true,
    credentials: true,
  })
);
if (isProd && (!corsOrigins || corsOrigins.length === 0)) {
  console.error("FATAL: NODE_ENV=production requer CORS_ORIGINS (lista separada por vírgulas).");
  process.exit(1);
}

app.use(
  express.json({
    limit: "25mb",
    verify: (req, _res, buf) => {
      const r = req as Request;
      const pathOnly = (r.originalUrl || r.url || "").split("?")[0];
      if (req.method === "POST" && pathOnly === "/api/whatsapp/webhook") {
        r.rawBody = Buffer.from(buf);
      }
    },
  })
);

const agentLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const auth = req.headers.authorization ?? "";
    const m = auth.match(/Bearer\s+(.+)/i);
    return m ? m[1].slice(0, 64) : req.ip ?? "anon";
  },
});

const processBody = z.object({
  message: z.string().min(1).max(8000),
});

function logValidationError(route: string, err: z.ZodError) {
  logStructured("validation_error", { route, details: err.flatten() });
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "onco-backend" });
});

app.post("/api/support/chat", agentLimiter, idempotencyMiddleware(), requireUser, async (req, res) => {
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
    logStructured("support_chat_failed", { err: e instanceof Error ? e.message : String(e) });
    res.status(500).json({
      error: "support_failed",
      reply: "Não foi possível obter resposta do suporte agora. Tente novamente em instantes.",
    });
  }
});

app.post("/api/agent/process", agentLimiter, idempotencyMiddleware(), requireUser, async (req, res) => {
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
    logStructured("agent_process_failed", { err: e instanceof Error ? e.message : String(e) });
    res.status(500).json({
      error: "Agent processing failed",
      reply:
        "Sistema temporariamente indisponível. Se precisar de ajuda clínica urgente, ligue para sua clínica ou procure o pronto-socorro.",
    });
  }
});

function normalizeOcrRequestBody(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const b = { ...(body as Record<string, unknown>) };
  if (b.mimeType === "image/jpg") b.mimeType = "image/jpeg";
  return b;
}

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

app.post("/api/ocr/analyze", agentLimiter, idempotencyMiddleware(), requireUser, async (req, res) => {
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
    logStructured("ocr_analyze_failed", { err: e instanceof Error ? e.message : String(e) });
    res.status(500).json({
      error: "ocr_failed",
      message: "Não foi possível ler o exame agora. Tente foto mais nítida ou insira os valores manualmente.",
    });
  }
});

app.post("/api/staff/ocr/analyze", agentLimiter, idempotencyMiddleware(), requireUser, async (req, res) => {
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
    logStructured("staff_ocr_failed", { code: code || "error", err: e instanceof Error ? e.message : String(e) });
    res.status(500).json({
      error: "ocr_failed",
      message: "Não foi possível processar o exame. Tente outra imagem ou PDF.",
    });
  }
});

/** Compat: redireciona clientes antigos para o endpoint de OCR da Fase 2. */
mountExamRoutes(app, env, agentLimiter);

mountWhatsappRoutes(app, env, agentLimiter);

app.post("/api/agent/vision-delegate", agentLimiter, idempotencyMiddleware(), requireUser, async (_req, res) => {
  res.status(410).json({
    error: "use_ocr_endpoint",
    message: "Use POST /api/ocr/analyze com imageBase64 e mimeType (documentType opcional — a IA classifica se omitido).",
  });
});

const listenHost = process.env.LISTEN_HOST ?? "0.0.0.0";
app.listen(env.PORT, listenHost, () => {
  const r2 = isR2Configured(env);
  logStructured("server_listen", { port: env.PORT, host: listenHost, r2: Boolean(r2) });
  console.log(`onco-backend listening on http://${listenHost}:${env.PORT}`);
  console.log(
    r2
      ? "[storage] Cloudflare R2 ativo (ficheiros de exames em R2)."
      : "[storage] Cloudflare R2 desativado — defina R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_BUCKET ou R2_BUCKET_NAME no .env. OCR grava só metadados (inline-ocr/…)."
  );
});
