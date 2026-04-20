# Architecture

**Analysis Date:** 2026-04-20

## Pattern Overview

**Overall:** Monorepo with **three first-party applications** (patient mobile, hospital web SPA, Node API) plus **Supabase** as the system of record (Postgres, Auth, Storage, Realtime) and **Supabase Edge Functions** for scheduled/internal jobs. Cross-cutting clinical and operational rules live primarily in **SQL (RLS, triggers, RPCs)** under `supabase/migrations/`.

**Key Characteristics:**

- **RLS-first data access:** Mobile and dashboard use the **anon Supabase client** with the user’s JWT; Postgres enforces visibility and writes. The backend repeats the same pattern by minting a **user-scoped** Supabase client from `Authorization: Bearer` for server routes that need Postgres under the caller’s identity.
- **Split brain by sensitivity:** Anything needing **vendor API keys**, **webhook signature verification**, or **large binary pipelines** goes through **`backend/src/index.ts`** (Express). Day-to-day CRUD and subscriptions stay on **Supabase** from clients.
- **File-based routing (mobile):** Expo Router drives navigation and lazy composition of stacks/tabs from `mobile/app/`.

## Layers

**Presentation — Patient (Expo):**

- Purpose: Patient-facing UI, onboarding, health modules, offline-tolerant patterns where implemented.
- Location: `mobile/app/` (routes), `mobile/src/` (hooks, contexts, domain UI, lib).
- Contains: Route layouts (`Stack`, material top tabs), feature screens, TanStack Query usage, theme tokens.
- Depends on: `@supabase/supabase-js` via `mobile/src/lib/supabase.ts`, TanStack Query (`mobile/src/lib/queryClient.ts`), backend HTTP base URL from `mobile/src/lib/apiConfig.ts`.
- Used by: End users (patients/caregivers).

**Presentation — Hospital (Vite + React Router):**

- Purpose: Staff triage, patient dossier, agenda, messaging workspaces, settings.
- Location: `hospital-dashboard/src/`.
- Contains: Lazy-loaded pages (`hospital-dashboard/src/App.tsx`), UI primitives under `hospital-dashboard/src/components/ui/`, feature components under `hospital-dashboard/src/components/patient/` and `hospital-dashboard/src/components/oncocare/`.
- Depends on: `hospital-dashboard/src/lib/supabase.ts` (`VITE_SUPABASE_*`), optional backend URLs such as `hospital-dashboard/src/lib/backendUrl.ts` where HTTP to Express is required.
- Used by: Authenticated staff (`profiles.role`, hospital linkage).

**Application API (Express):**

- Purpose: Authenticated HTTP API for OCR, agent/support chat, exams compatibility, WhatsApp (Meta / Evolution), FHIR-related routes, webhooks.
- Location: `backend/src/index.ts` (composition root), `backend/src/*Handlers.ts`, `backend/src/*Routes.ts`, `backend/src/*Service.ts`, `backend/src/*Webhook.ts`.
- Contains: `helmet`, `cors`, `express-rate-limit`, **Zod** request bodies, `authenticateBearer` middleware, `idempotencyMiddleware` on mutating routes.
- Depends on: `backend/src/config.ts` (`loadEnv`), `backend/src/supabase.ts` (`createUserSupabase`), external SDKs (Gemini/OpenAI), `backend/src/r2.ts` when configured.
- Used by: Mobile and dashboard (Bearer JWT from Supabase session).

**Data & rules (Supabase / Postgres):**

- Purpose: Canonical schema, RLS, RPCs, audit triggers, realtime publication where enabled.
- Location: `supabase/migrations/` (evolution of schema; dozens of timestamped SQL files), `supabase/functions/` (Deno Edge Functions for cron-style and internal workflows — not the same runtime as Express).
- Contains: Tables such as `patients`, `profiles`, hospital linking, exams, messaging-related tables (see migrations like `supabase/migrations/20260619160000_whatsapp_inbound_messages.sql`), staff assignments, infusion resources, etc.
- Depends on: Supabase platform (Auth JWT validation at the edge of Postgres).
- Used by: All clients and backend user-scoped Supabase clients.

**Shared domain logic (TypeScript, cross-repo):**

- Purpose: Canonical clinical helpers reused by Node and potentially other packages.
- Location: `shared/` (`shared/protocolEvaluation.ts`, `shared/biomarkerCanonical.ts`, etc.).
- Contains: Pure functions / small modules without UI.
- Depends on: None at runtime beyond TS/JS standard library patterns.
- Used by: Backend imports; mobile/dashboard may duplicate or import depending on bundling (verify import graph before adding heavy deps).

## Data Flow

**Authenticated patient session (mobile):**

1. `mobile/src/auth/AuthContext.tsx` subscribes to `supabase.auth` and holds `Session`.
2. `mobile/app/index.tsx` gates navigation: no session → intro/splash; session without LGPD consent → `/lgpd-consent`; then `PatientProvider` loads `patients` via Supabase (`mobile/src/patient/PatientContext.tsx`) including caregiver branch queries.
3. Feature screens under `mobile/app/(tabs)/` read/write through Supabase client + TanStack Query cache keys scoped by user/patient.
4. For OCR, agent, or support chat, callers use `getApiBaseUrl()` and attach **Bearer** token to Express routes registered in `backend/src/index.ts` (e.g. `/api/ocr/analyze`, `/api/agent/process`, `/api/support/chat`).

**Staff dashboard session:**

1. `hospital-dashboard/src/App.tsx` wires `BrowserRouter`, lazy routes, and Supabase auth (`supabase.auth.*`).
2. `hospital-dashboard/src/context/OncoCareContext.tsx` composes `useTriageData` and `usePatientListFilters` for workspace state.
3. Patient dossier and tabs live under `hospital-dashboard/src/pages/` and `hospital-dashboard/src/components/patient/tabs/`; data hooks under `hospital-dashboard/src/hooks/` encapsulate Supabase selects and realtime subscriptions where used.
4. Staff OCR and similar flows hit backend routes (e.g. `POST /api/staff/ocr/analyze` in `backend/src/index.ts`) with the same Bearer pattern.

**Inbound WhatsApp / Evolution:**

1. External provider posts to `mountEvolutionWebhook` (`backend/src/evolutionWebhook.ts`) and/or Meta routes in `backend/src/whatsappRoutes.ts` (mounted from `backend/src/index.ts`).
2. Webhook handlers validate signatures / raw body where applicable (see `express.json` `verify` hook in `backend/src/index.ts` for WhatsApp path).
3. Persistence uses service-role or controlled inserts as implemented per handler — align new events with tables introduced in migrations such as `supabase/migrations/20260619160000_whatsapp_inbound_messages.sql`.

**State Management:**

- **Mobile:** React Context for auth and patient profile; **TanStack Query** for server/async state; Expo Router for navigation state.
- **Dashboard:** React state local to pages; **OncoCareContext** for triage list model; Supabase realtime where hooks subscribe.

## Key Abstractions

**Supabase browser/mobile client:**

- Purpose: Single anon client per app with user JWT attached after login.
- Examples: `mobile/src/lib/supabase.ts`, `hospital-dashboard/src/lib/supabase.ts`.
- Pattern: `createClient` + platform-specific auth storage (SecureStore vs web `localStorage` on mobile).

**User-scoped Supabase on the server:**

- Purpose: Run Postgres operations **as the authenticated user** inside Express handlers (inherits RLS).
- Examples: `backend/src/authMiddleware.ts` (`authenticateBearer`), `backend/src/supabase.ts` (`createUserSupabase`).
- Pattern: Validate JWT → attach `{ supabase, userId }` on `req.authUser` for downstream services.

**Feature hooks (dashboard):**

- Purpose: Encapsulate query shapes, joins, and UI-specific derivations.
- Examples: `hospital-dashboard/src/hooks/usePatientCore.ts`, `hospital-dashboard/src/hooks/useTriageData.ts`, `hospital-dashboard/src/hooks/usePatientExams.ts`.

**Patient/caregiver model (mobile):**

- Purpose: Unify “owns patient row” vs “caregiver linked to patient” under one context API.
- Examples: `mobile/src/patient/PatientContext.tsx` (role probe on `profiles`, `patient_caregivers` join).

## Entry Points

**Mobile (Expo Router root layout):**

- Location: `mobile/app/_layout.tsx`
- Triggers: App launch; wraps providers (`AuthProvider`, `PatientProvider`, `QueryClientProvider`, `AppErrorBoundary`, gesture/safe-area/toast).
- Responsibilities: Global navigation shell (`Stack` screens), font loading, Sentry bootstrap import.

**Mobile (initial route decision):**

- Location: `mobile/app/index.tsx`
- Triggers: Navigation to `/` after auth events.
- Responsibilities: Auth → consent → patient load gate; explicit UI on `patientFetchError` to avoid silent redirect loops.

**Hospital dashboard (DOM bootstrap):**

- Location: `hospital-dashboard/src/main.tsx`
- Triggers: Browser load.
- Responsibilities: `createRoot`, `StrictMode`, `BrowserRouter`, top-level `ErrorBoundary`, `App`, Sonner toaster.

**Hospital dashboard (routing + auth shell):**

- Location: `hospital-dashboard/src/App.tsx`
- Triggers: Session changes from Supabase.
- Responsibilities: Lazy `Routes` to major pages (`OncoCarePatientsPage`, `PatientDossierRoute`, `InfusionOpsDashboardPage`, etc.), `OncoCareProvider`, login UI.

**Backend HTTP server:**

- Location: `backend/src/index.ts`
- Triggers: Process start (`node` / production supervisor).
- Responsibilities: Register middleware, **Zod**-validated JSON routes, mount `mountExamRoutes`, `mountWhatsappRoutes`, `mountEvolutionWebhook`, `mountFhirRoutes`, listen on `env.PORT`.

**Note on `index.ts` elsewhere:** Supabase Edge Functions each expose `supabase/functions/<name>/index.ts` as Deno entrypoints (separate deploy unit from Express). Landing marketing app uses `landing-page-onco/src/main.tsx` (out of patient↔backend core loop).

## Error Handling

**Strategy:** **Validate at the boundary**, return **typed JSON errors**, log structured server-side events; UI layers show user-safe Portuguese messages.

**Patterns:**

- **HTTP API:** `z.safeParse` on bodies; 400 `invalid_request` with flattened details logged via `logStructured` (`backend/src/index.ts`, `backend/src/logger.ts`); domain-specific 422 (`OcrRejectedNotMedical`); 403/404 for RLS / missing patient in staff OCR handler.
- **Mobile route gate:** `mobile/app/index.tsx` renders retry UI when patient query fails instead of redirecting into inconsistent navigation.
- **Mobile global:** `AppErrorBoundary` (`mobile/src/components/AppErrorBoundary.tsx`) under root layout; Expo Router `ErrorBoundary` export from `mobile/app/_layout.tsx`.
- **Dashboard global:** `ErrorBoundary` wrapper in `hospital-dashboard/src/main.tsx` with Portuguese title prop.

## Cross-Cutting Concerns

**Logging:** `backend/src/logger.ts` with `logStructured` for machine-friendly entries on failures and startup (`backend/src/index.ts`).

**Validation:** **Zod** on Express bodies; client-side validation remains UI responsibility — prefer mirroring critical invariants in SQL (constraints/RLS) for security.

**Authentication:** Supabase Auth JWT end-to-end; Express uses Bearer validation per request (`backend/src/authMiddleware.ts`). Do not ship service-role keys to clients.

**Idempotency:** `idempotencyMiddleware` from `backend/src/idempotencyMiddleware.ts` on selected POST routes to safe-guard retries.

---

*Architecture analysis: 2026-04-20*
