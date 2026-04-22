import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * `dotenv.config()` por vezes falha com `tsx watch`. Leitura explícita + parse garante variáveis.
 * Ordem: raiz do repo → `backend/.env` (vários caminhos) — último valor por chave vence.
 */
function mergeEnvFromFile(filePath: string) {
  if (!existsSync(filePath)) return;
  try {
    const raw = readFileSync(filePath);
    const parsed = dotenv.parse(raw);
    for (const [key, value] of Object.entries(parsed)) {
      process.env[key] = value;
    }
  } catch (e) {
    console.warn(`[env] não foi possível ler ${filePath}:`, e);
  }
}

function loadDotenvFiles() {
  const paths = [
    path.resolve(__dirname, "../../.env"),
    path.resolve(__dirname, "../.env"),
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), "backend", ".env"),
  ];
  const seen = new Set<string>();
  for (const p of paths) {
    const n = path.normalize(p);
    if (seen.has(n)) continue;
    seen.add(n);
    mergeEnvFromFile(n);
  }
}

loadDotenvFiles();

const trim = (v: unknown) => (typeof v === "string" ? v.trim() : v);

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  SUPABASE_URL: z.preprocess(trim, z.string().url()),
  SUPABASE_ANON_KEY: z.preprocess(trim, z.string().min(1)),
  /** JWT Secret do projeto (Dashboard → Settings → API → JWT Secret). Validação local do Bearer no Express. */
  SUPABASE_JWT_SECRET: z.preprocess(trim, z.string().min(1)),
  GEMINI_API_KEY: z.preprocess(trim, z.string().min(1)),
  /** Modelo Gemini para OCR (regra: Gemini 3 Flash Preview). */
  GEMINI_MODEL: z.preprocess(trim, z.string().min(1).optional()),
  OPENAI_API_KEY: z.preprocess(trim, z.string().min(1).optional()),
  /** Ex.: gpt-4o-mini */
  OPENAI_MODEL: z.preprocess(trim, z.string().min(1).optional()),
  HOSPITAL_ALERT_WEBHOOK_URL: z.preprocess(trim, z.string().url().optional().or(z.literal(""))),
  /** HMAC-SHA256 (hex) do corpo JSON para X-Webhook-Signature; obrigatório se o webhook estiver configurado em produção. */
  HOSPITAL_ALERT_WEBHOOK_SECRET: z.preprocess(trim, z.string().optional().or(z.literal(""))),
  /** Cloudflare R2 (API S3). Opcional: sem isto, OCR grava só metadados (sem ficheiro em R2). */
  R2_ACCOUNT_ID: z.preprocess(trim, z.string().optional().or(z.literal(""))),
  R2_ACCESS_KEY_ID: z.preprocess(trim, z.string().optional().or(z.literal(""))),
  R2_SECRET_ACCESS_KEY: z.preprocess(trim, z.string().optional().or(z.literal(""))),
  R2_BUCKET: z.preprocess(trim, z.string().optional().or(z.literal(""))),
  /** Alias comum; se existir e `R2_BUCKET` estiver vazio, usa-se este valor. */
  R2_BUCKET_NAME: z.preprocess(trim, z.string().optional().or(z.literal(""))),
  /** Service role: inserts/updates que o cliente não faz (outbound_messages, webhook Meta). */
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(trim, z.string().optional().or(z.literal(""))),
  /** WhatsApp Cloud API — opcional; sem isto, POST /api/whatsapp/send retorna 503. */
  WHATSAPP_ACCESS_TOKEN: z.preprocess(trim, z.string().optional().or(z.literal(""))),
  WHATSAPP_PHONE_NUMBER_ID: z.preprocess(trim, z.string().optional().or(z.literal(""))),
  /** Verificação do webhook GET e opcionalmente assinatura POST. */
  WHATSAPP_VERIFY_TOKEN: z.preprocess(trim, z.string().optional().or(z.literal(""))),
  WHATSAPP_APP_SECRET: z.preprocess(trim, z.string().optional().or(z.literal(""))),
  WHATSAPP_API_VERSION: z.preprocess(trim, z.string().optional().or(z.literal(""))),
  /** Evolution API v2 (WhatsApp). Opcional; usado quando `resolveMessagingProvider` escolhe evolution. */
  EVOLUTION_API_BASE_URL: z.preprocess((v) => {
    const t = trim(v);
    return t === "" ? undefined : t;
  }, z.string().url().optional()),
  EVOLUTION_API_KEY: z.preprocess(trim, z.string().optional().or(z.literal(""))),
  EVOLUTION_INSTANCE_NAME: z.preprocess(trim, z.string().optional().or(z.literal(""))),
  /** Segredo na query `?secret=` de POST /api/evolution/webhook */
  EVOLUTION_WEBHOOK_SECRET: z.preprocess(trim, z.string().optional().or(z.literal(""))),
  /** Força canal quando Meta e Evolution estão ambos configurados: meta | evolution */
  MESSAGING_PROVIDER: z.preprocess(trim, z.string().optional().or(z.literal(""))),
  /** Lista separada por vírgulas de origens CORS permitidas. Vazio = modo permissivo (dev). */
  CORS_ORIGINS: z.preprocess(trim, z.string().optional().or(z.literal(""))),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const backendEnv = path.resolve(__dirname, "../.env");
    console.error(parsed.error.flatten());
    console.error(
      `Env hint: esperado ficheiro em disco em ${backendEnv} (guarda o .env no editor com Ctrl+S antes de npm run dev).`
    );
    throw new Error("Invalid environment variables");
  }
  return {
    ...parsed.data,
    /** Padrão: gemini-3-flash-preview; fallback de OCR = OpenAI (OPENAI_API_KEY + gpt-4o-mini). */
    GEMINI_MODEL: parsed.data.GEMINI_MODEL ?? "gemini-3-flash-preview",
    OPENAI_MODEL: parsed.data.OPENAI_MODEL ?? "gpt-4o-mini",
    OPENAI_API_KEY:
      parsed.data.OPENAI_API_KEY === "" || parsed.data.OPENAI_API_KEY === undefined
        ? undefined
        : parsed.data.OPENAI_API_KEY,
    HOSPITAL_ALERT_WEBHOOK_URL:
      parsed.data.HOSPITAL_ALERT_WEBHOOK_URL === ""
        ? undefined
        : parsed.data.HOSPITAL_ALERT_WEBHOOK_URL,
    HOSPITAL_ALERT_WEBHOOK_SECRET:
      parsed.data.HOSPITAL_ALERT_WEBHOOK_SECRET === "" || parsed.data.HOSPITAL_ALERT_WEBHOOK_SECRET === undefined
        ? undefined
        : parsed.data.HOSPITAL_ALERT_WEBHOOK_SECRET,
    R2_ACCOUNT_ID: emptyToUndef(parsed.data.R2_ACCOUNT_ID),
    R2_ACCESS_KEY_ID: emptyToUndef(parsed.data.R2_ACCESS_KEY_ID),
    R2_SECRET_ACCESS_KEY: emptyToUndef(parsed.data.R2_SECRET_ACCESS_KEY),
    R2_BUCKET: emptyToUndef(parsed.data.R2_BUCKET || parsed.data.R2_BUCKET_NAME),
    SUPABASE_SERVICE_ROLE_KEY: emptyToUndef(parsed.data.SUPABASE_SERVICE_ROLE_KEY),
    WHATSAPP_ACCESS_TOKEN: emptyToUndef(parsed.data.WHATSAPP_ACCESS_TOKEN),
    WHATSAPP_PHONE_NUMBER_ID: emptyToUndef(parsed.data.WHATSAPP_PHONE_NUMBER_ID),
    WHATSAPP_VERIFY_TOKEN: emptyToUndef(parsed.data.WHATSAPP_VERIFY_TOKEN),
    WHATSAPP_APP_SECRET: emptyToUndef(parsed.data.WHATSAPP_APP_SECRET),
    WHATSAPP_API_VERSION:
      parsed.data.WHATSAPP_API_VERSION === "" || parsed.data.WHATSAPP_API_VERSION === undefined
        ? "v21.0"
        : parsed.data.WHATSAPP_API_VERSION,
    EVOLUTION_API_BASE_URL: parsed.data.EVOLUTION_API_BASE_URL,
    EVOLUTION_API_KEY: emptyToUndef(parsed.data.EVOLUTION_API_KEY),
    EVOLUTION_INSTANCE_NAME: emptyToUndef(parsed.data.EVOLUTION_INSTANCE_NAME),
    EVOLUTION_WEBHOOK_SECRET: emptyToUndef(parsed.data.EVOLUTION_WEBHOOK_SECRET),
    MESSAGING_PROVIDER: emptyToUndef(parsed.data.MESSAGING_PROVIDER),
    CORS_ORIGINS:
      parsed.data.CORS_ORIGINS === "" || parsed.data.CORS_ORIGINS === undefined
        ? undefined
        : parsed.data.CORS_ORIGINS,
  };
}

function emptyToUndef(v: string | undefined): string | undefined {
  return v === "" || v === undefined ? undefined : v;
}
