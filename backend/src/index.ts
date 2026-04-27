import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { loadEnv } from "./lib/config.js";
import { logStructured } from "./lib/logger.js";
import { isR2Configured } from "./lib/r2.js";
import { getPostHogClient, shutdownPostHog } from "./lib/posthog.js";
import { mountExamRoutes } from "./modules/files/routes.js";
import { mountPrescriptionRoutes } from "./modules/medications/routes.js";
import { mountFhirRoutes } from "./modules/fhir/routes.js";
import { mountWhatsappRoutes, mountWhatsappWebhookEarly, mountEvolutionWebhook } from "./modules/notifications/routes.js";
import { mountAiRiskRoutes } from "./modules/ai-risk/routes.js";
import { authenticateBearer } from "./middleware/authMiddleware.js";
import { mountStubModuleRouters } from "./modules/mountStubs.js";

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

/** Meta / raw-body webhook must run before `express.json()`. */
mountWhatsappWebhookEarly(app, env);

app.use(express.json({ limit: "25mb" }));

const ipAgentLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? "anon",
});

const userAgentLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const uid = (req as express.Request & { authUser?: { userId: string } }).authUser?.userId;
    return uid ?? "unauthenticated";
  },
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "onco-backend" });
});

mountAiRiskRoutes(app, env, { ipAgentLimiter, userAgentLimiter, requireUser });

mountExamRoutes(app, env, ipAgentLimiter, userAgentLimiter);
mountPrescriptionRoutes(app, env, ipAgentLimiter, userAgentLimiter);

mountWhatsappRoutes(app, env, ipAgentLimiter, userAgentLimiter);
mountEvolutionWebhook(app, env);
mountFhirRoutes(app, env, ipAgentLimiter, userAgentLimiter);

mountStubModuleRouters(app);

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
  getPostHogClient()?.capture({ distinctId: "server", event: "server started", properties: { port: env.PORT } });
});

async function gracefulShutdown() {
  await shutdownPostHog();
  process.exit(0);
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
