# External Integrations

**Analysis Date:** 2026-04-20

## APIs & External Services

**Supabase (hosted platform):**
- **Auth (JWT)** — Mobile and hospital dashboard use `@supabase/supabase-js` with anon key + user session. Backend validates Bearer tokens via Supabase (`backend/src/authMiddleware.ts`, `backend/src/supabase.ts`).
- **PostgREST / Postgres** — Primary data store; RLS enforced per migrations in `supabase/migrations/`. Backend may use user-scoped or service-role clients depending on route (see `backend/README.md`).
- **Realtime** — Dashboard subscribes to live updates (architecture in root `README.md` §2.1). Migrations such as `supabase/migrations/20260619150100_realtime_patient_hospital_link_events.sql` relate to realtime publication patterns.
- **Storage** — Buckets for user/medical files per product docs; exam scan flow prefers **R2** through backend when R2 env vars are set (`backend/.env.example` comments vs `medical_scans` note).
- **Edge Functions (Deno)** — HTTP functions under `supabase/functions/` (e.g. `medication-reminders/`, `treatment-reminders/`, `appointment-reminders/`, `patient-link-notify/`, `generate-evolution-report/`, `pro-questionnaire-dispatch/`, `risk-projection-stub/`, `requires-action-webhook` per `supabase/functions/README.md`).

**Google AI (Gemini):**
- **Package:** `@google/generative-ai` in `backend/package.json`.
- **Usage:** OCR and structured triage JSON paths (`backend/src/gemini.ts`, `backend/src/ocrGemini.ts`, `backend/src/agentService.ts` orchestration). API key: **`GEMINI_API_KEY`** in `backend/.env.example`; optional **`GEMINI_MODEL`** override.

**OpenAI:**
- **Package:** `openai` in `backend/package.json`.
- **Usage:** Support chat (`backend/src/supportOpenAi.ts`), OCR fallback when Gemini fails (`backend/src/ocrOpenAi.ts`). Keys: **`OPENAI_API_KEY`**, **`OPENAI_MODEL`** (default `gpt-4o-mini`) in `backend/.env.example`.

**Cloudflare R2 (S3-compatible object storage):**
- **Client:** `@aws-sdk/client-s3` and presigner in `backend/package.json`; implementation `backend/src/r2.ts`, `backend/src/isR2Configured` usage from `backend/src/index.ts`.
- **Configuration:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` or `R2_BUCKET_NAME` in `backend/.env.example`; root `.env.example` also lists **`R2_PUBLIC_URL`** for optional public URLs.

**Meta WhatsApp Cloud API:**
- **Routes:** `backend/src/whatsappRoutes.ts` — send (`POST /api/whatsapp/send` per docs), webhook (`POST /api/whatsapp/webhook` with raw body capture in `backend/src/index.ts` for signature verification).
- **Env:** `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, optional `WHATSAPP_APP_SECRET` (`X-Hub-Signature-256`), `WHATSAPP_API_VERSION` (`backend/.env.example`).

**Evolution API v2 (WhatsApp):**
- **Webhook:** `backend/src/evolutionWebhook.ts` mounted from `backend/src/index.ts` — `POST /api/evolution/webhook` with `secret` query validation (`EVOLUTION_WEBHOOK_SECRET`).
- **Send path:** Same messaging surface as Meta; provider selection via **`MESSAGING_PROVIDER`** (`meta` | `evolution`) when both configured (`backend/src/messagingProvider.ts`, `backend/README.md`).
- **Env:** `EVOLUTION_API_BASE_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_NAME` (`backend/.env.example`).

**Hospital alert webhook (outbound from backend / Edge):**
- **Backend:** `HOSPITAL_ALERT_WEBHOOK_URL`, `HOSPITAL_ALERT_WEBHOOK_SECRET` — HMAC-SHA256 hex in `X-Webhook-Signature` header (`backend/.env.example`).
- **Edge:** `requires-action-webhook` function uses the same contract per `supabase/functions/README.md`.

**FHIR (interoperability surface):**
- **Routes:** `backend/src/fhirRoutes.ts` mounted from `backend/src/index.ts` — expose/accept FHIR-related HTTP behavior (details in implementation files).

**Expo Push Notifications:**
- **Client:** `expo-notifications` in `mobile/package.json`.
- **Server-side:** Edge Functions invoke Expo Push API using project secrets (see `supabase/functions/README.md` and function sources under `supabase/functions/*` for push-related flows).

**Sentry:**
- **Package:** `@sentry/react-native` in `mobile/package.json` — crash/error telemetry for the patient app.

**Apple HealthKit:**
- **Package:** `@kingstinct/react-native-healthkit` — native health data on iOS (`mobile/package.json`).

## Data Storage

**Databases:**
- **PostgreSQL 17** (Supabase) — Local major version in `supabase/config.toml` (`[db]` → `major_version = 17`). Migrations in `supabase/migrations/`.
- **Client:** `@supabase/supabase-js` from mobile, dashboard, and backend; service role used only server-side (`backend/.env.example`, `supabase/functions/README.md`).

**File Storage:**
- **Cloudflare R2** — Primary for exam uploads when configured (backend path above).
- **Supabase Storage** — Enabled in `supabase/config.toml` (`[storage]`); product notes distinguish bucket usage vs R2 for OCR pipeline (`backend/.env.example` comments).

**Caching:**
- Not detected as a dedicated integration (no Redis/Memcached client in scanned `package.json` files). Rate limiting is in-process via `express-rate-limit` (`backend/src/index.ts`).

## Authentication & Identity

**Auth Provider:**
- **Supabase Auth** — Email/OAuth flows described in root `README.md` §3.1. JWT presented as `Authorization: Bearer` to backend routes guarded by `authenticateBearer` (`backend/src/index.ts`).

## Monitoring & Observability

**Error Tracking:**
- **Sentry** — Mobile SDK only in current manifests (`mobile/package.json`). No Sentry SDK listed in `backend/package.json` or `hospital-dashboard/package.json` from this audit.

**Logs:**
- **Structured logging** — `backend/src/logger.ts` consumed from `backend/src/index.ts` and domain modules.

## CI/CD & Deployment

**Hosting:**
- **GitHub Actions** — `.github/workflows/ci.yml`: jobs `backend` (install, test, build), `mobile` (install, typecheck), `hospital-dashboard` (install, build). **`landing-page-onco` is not in CI** — add a job if parity is required.

**CI Pipeline:**
- **Node 22**, **npm ci**, per-package `working-directory` as above.

## Environment Configuration

**Required env vars (representative — see examples, never commit secrets):**
- **Backend:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`; production messaging may need `WHATSAPP_*` and/or `EVOLUTION_*`, `SUPABASE_SERVICE_ROLE_KEY` for privileged paths; `GEMINI_API_KEY` / `OPENAI_API_KEY` for AI; `CORS_ORIGINS` mandatory in production (`backend/.env.example`, `backend/src/index.ts`).
- **Dashboard:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BACKEND_URL` (`hospital-dashboard/.env.example`).
- **Mobile:** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_URL` (`mobile/README.md`).
- **Supabase Edge Functions (remote secrets):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, **`CRON_SECRET`** (`supabase/functions/README.md`).

**Secrets location:**
- Local: per-app `.env` files (gitignored). Reference templates: `backend/.env.example`, `hospital-dashboard/.env.example`, root `.env.example`.
- Remote: Supabase project secrets for Edge Functions; EAS secrets for mobile builds (per Expo/EAS docs).

## Webhooks & Callbacks

**Incoming:**
- **Meta WhatsApp** — `POST /api/whatsapp/webhook` (`backend/src/whatsappRoutes.ts`, raw body in `backend/src/index.ts`).
- **Evolution** — `POST /api/evolution/webhook?secret=...` (`backend/src/evolutionWebhook.ts`); persistence aligned with `supabase/migrations/20260619160000_whatsapp_inbound_messages.sql` (inbound messages table).
- **Edge Functions** — Invoked by cron/HTTP with `Authorization: Bearer <CRON_SECRET>` or JWT per function (`supabase/functions/README.md`).

**Outgoing:**
- **WhatsApp** (Meta or Evolution) — Outbound sends from `backend/src/whatsappRoutes.ts` / messaging provider abstraction.
- **Hospital alert URL** — Optional signed POST from backend or `requires-action-webhook` Edge Function.
- **Expo Push** — From scheduled Edge Functions to user devices.

---

*Integration audit: 2026-04-20*
