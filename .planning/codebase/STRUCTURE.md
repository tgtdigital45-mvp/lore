# Codebase Structure

**Analysis Date:** 2026-04-20

## Directory Layout

```
aura-onco/
├── .cursor/              # Editor/agent rules (optional)
├── .github/              # CI workflows
├── .maestro/             # Mobile E2E flows (Maestro)
├── .planning/            # GSD / planning artifacts (this folder)
├── backend/              # Express API (Node/TypeScript)
├── docs/                 # Product/engineering markdown library
├── hospital-dashboard/   # Vite + React staff SPA
├── landing-page-onco/    # Marketing SPA (Vite)
├── mobile/               # Expo Router patient app
├── scripts/              # Repo maintenance scripts
├── shared/               # Cross-package TS helpers (protocols, biomarkers)
├── supabase/             # Migrations, config, Edge Functions
├── README.md             # Monorepo overview & architecture diagrams
└── TODO_MASTER.md        # Roadmap scratchpad (if present)
```

## Directory Purposes

**`mobile/`:**

- Purpose: Patient/caregiver **Expo** application (iOS/Android/web experimental).
- Contains: Expo Router file routes, React contexts, hooks, feature modules (health, diary, exams, medications).
- Key files: `mobile/app/_layout.tsx`, `mobile/app/index.tsx`, `mobile/app/(tabs)/_layout.tsx`, `mobile/src/lib/supabase.ts`, `mobile/src/lib/apiConfig.ts`, `mobile/src/auth/AuthContext.tsx`, `mobile/src/patient/PatientContext.tsx`.

**`hospital-dashboard/`:**

- Purpose: **Vite + React Router** SPA for hospital staff (triage, dossier, agenda, messaging).
- Contains: `src/pages` route targets, `src/components` feature/UI, `src/hooks` data access, `src/lib` clients and formatters, `src/context` app-level state.
- Key files: `hospital-dashboard/src/main.tsx`, `hospital-dashboard/src/App.tsx`, `hospital-dashboard/src/lib/supabase.ts`, `hospital-dashboard/src/context/OncoCareContext.tsx`.

**`backend/`:**

- Purpose: **Express** server for privileged integrations (OCR/LLM, WhatsApp providers, R2, FHIR-related HTTP).
- Contains: `backend/src/index.ts` composition root, middleware, route modules, service modules, tests co-located as `*.test.ts`.
- Key files: `backend/src/index.ts`, `backend/src/authMiddleware.ts`, `backend/src/config.ts`, `backend/src/agentService.ts`, `backend/src/ocrService.ts`, `backend/src/whatsappRoutes.ts`, `backend/src/evolutionWebhook.ts`, `backend/src/fhirRoutes.ts`.

**`supabase/migrations/`:**

- Purpose: **Versioned Postgres schema** — tables, RLS policies, RPCs, indexes, triggers, storage policies.
- Contains: Timestamp-prefixed `.sql` files (62+ migrations); treat order as authoritative history.
- Key examples: `supabase/migrations/20260410120000_initial_schema.sql`, link/audit/evolution of hospital integration sprints, `supabase/migrations/20260619160000_whatsapp_inbound_messages.sql`, `supabase/migrations/20260619140000_patient_link_reopen_history_rpc.sql`.

**`supabase/functions/`:**

- Purpose: **Deno Edge Functions** (cron hooks, internal notifications, report generation stubs) — separate entrypoints per folder `index.ts`.
- Contains: One function per directory under `supabase/functions/*/index.ts`.

**`shared/`:**

- Purpose: **Reusable domain logic** without UI (e.g. protocol evaluation, biomarker canonicalization).
- Contains: `shared/package.json`, `shared/*.ts` modules and compiled `shared/lib/*.js` where applicable.

**`docs/`:**

- Purpose: Human-facing specifications, compliance notes, runbooks.
- Contains: Markdown references consumed by humans (not runtime).

**`scripts/`:**

- Purpose: Automation for local dev, data tasks, or CI helpers.

**`landing-page-onco/`:**

- Purpose: Static/marketing site; not part of clinical data plane.

## Key File Locations

**Entry Points:**

- `mobile/app/_layout.tsx` — root providers and stack navigator.
- `mobile/app/index.tsx` — post-auth routing gate (consent + patient).
- `hospital-dashboard/src/main.tsx` — React DOM bootstrap.
- `hospital-dashboard/src/App.tsx` — auth shell, lazy routes, `OncoCareProvider`.
- `backend/src/index.ts` — Express app creation and route mounting.
- `supabase/functions/<name>/index.ts` — Edge function entrypoints (Deno).

**Configuration:**

- `backend/.env.example` — documented server env vars (do not commit real `.env`).
- `mobile/app.config.js` / Expo config (not listed if absent; check `mobile/` root for `app.json` / `app.config.*`).
- `hospital-dashboard/vite.config.*` — bundler and `VITE_*` injection.

**Core Logic:**

- `mobile/src/` — domain UI, auth, patient, health integrations.
- `hospital-dashboard/src/hooks/` — staff data access patterns.
- `backend/src/*Service.ts`, `backend/src/*Handlers.ts` — orchestration of external APIs + Supabase user client.

**Testing:**

- `backend/src/*.test.ts` — Vitest/Jest style unit tests (e.g. `backend/src/metaWebhookSignature.test.ts`).
- `.maestro/` — mobile E2E scenarios.

## Naming Conventions

**Files:**

- **Migrations:** `YYYYMMDDHHMMSS_description.sql` under `supabase/migrations/`.
- **React components:** `PascalCase.tsx` in `hospital-dashboard/src/components/` and `mobile/src/components/`.
- **Hooks:** `useThing.ts` or `useThing.tsx` under `*/hooks/`.
- **Route files (Expo Router):** `index.tsx`, `[param].tsx`, `_layout.tsx` under `mobile/app/`.

**Directories:**

- `mobile/app/(tabs)/` — route group for main tabbed experience (parentheses = layout group, not URL segment).
- `hospital-dashboard/src/components/ui/` — shadcn-style primitives.
- `hospital-dashboard/src/components/patient/` — dossier-specific UI.

**Exports:**

- Prefer **named exports** for contexts and hooks (`AuthProvider`, `useAuth`) as seen in `mobile/src/auth/AuthContext.tsx`.

## Where to Add New Code

**New patient-facing screen:**

- Route: `mobile/app/...` (match existing segment: `(tabs)` vs stack modal).
- Logic/hooks: `mobile/src/hooks/` or feature folder under `mobile/src/<feature>/`.
- Supabase access: reuse `mobile/src/lib/supabase.ts`; add TanStack Query keys next to the hook that owns the fetch.

**New staff dashboard page:**

- Lazy import in `hospital-dashboard/src/App.tsx` following existing `lazy(() => import("./pages/..."))` pattern.
- Page component: `hospital-dashboard/src/pages/NewPage.tsx`.
- Data: `hospital-dashboard/src/hooks/useNewThing.ts` calling `hospital-dashboard/src/lib/supabase.ts`.

**New authenticated HTTP capability:**

- Register route in `backend/src/index.ts` or create `backend/src/fooRoutes.ts` and **mount** from index (mirror `mountWhatsappRoutes` style).
- Validation: colocate Zod schemas next to handler or in a `schemas/` file if many routes share types.
- Auth: wrap with `authenticateBearer(env)` from `backend/src/authMiddleware.ts` when acting as the user; never expose service role to browsers.

**New database rule or table:**

- Add a new file under `supabase/migrations/` with a timestamp after latest migration.
- If RPCs power mobile/dashboard, document argument names in the same migration file and wire typed access via generated types where used (`hospital-dashboard/src/types/database.gen.ts` pattern).

**Shared clinical calculation:**

- Prefer `shared/` for pure functions, then import from `backend/src/` (verify bundler/tsconfig paths).

## Special Directories

**`supabase/migrations/`:**

- Purpose: Authoritative schema timeline for Postgres.
- Generated: No (hand-authored SQL).
- Committed: Yes — always commit migrations; never rewrite applied history.

**`.planning/codebase/`:**

- Purpose: GSD mapper outputs consumed by `/gsd-plan-phase` and `/gsd-execute-phase`.
- Generated: Semi-automatic (written by mapping passes).
- Committed: Typically yes for team alignment.

**`node_modules/` (per package):**

- Purpose: Installed dependencies.
- Generated: Yes.
- Committed: No — each package (`mobile/`, `hospital-dashboard/`, `backend/`) has its own install root.

---

*Structure analysis: 2026-04-20*
