# Technology Stack

**Analysis Date:** 2026-04-20

## Languages

**Primary:**
- **TypeScript** — All shipped application code in `backend/src/`, `mobile/`, `hospital-dashboard/src/`, `landing-page-onco/src/`, and `supabase/functions/` (Deno-compatible TS for Edge Functions).
- **SQL** — Schema, RLS, RPCs, and triggers in `supabase/migrations/*.sql`; optional SQL tests under `supabase/tests/`.

**Secondary:**
- **JavaScript (Node tooling)** — Mobile scripts such as `mobile/scripts/adb-reverse.mjs`, `mobile/scripts/generate-icons-from-logo.mjs` (see `mobile/package.json` scripts).
- **YAML** — Maestro E2E scenarios under `.maestro/` (see root `README.md` and `mobile/package.json` → `e2e:maestro`).

## Runtime

**Environment:**
- **Node.js** — Backend and all front-end build pipelines. CI uses **Node 22** (`.github/workflows/ci.yml`). Product docs recommend **Node 20+** for mobile (`mobile/README.md`); align local dev with CI when possible.

**Package Manager:**
- **npm** — Each app has its own `package.json` and **`package-lock.json`** at `backend/`, `mobile/`, `hospital-dashboard/`, and `landing-page-onco/`.
- **Lockfile:** Present per package; **no root `package.json`** — the monorepo is a multi-package workspace by convention only (`README.md` §4).

## Frameworks

**Core:**
- **Expo ~54** + **expo-router ~6** — Patient mobile app; entry `mobile/package.json` → `"main": "expo-router/entry"`. React Native **0.81.5**, React **19.1.0** (`mobile/package.json`).
- **Vite** — `hospital-dashboard` uses Vite **^6.1.0** with `@vitejs/plugin-react` (`hospital-dashboard/package.json`). `landing-page-onco` uses Vite **^8.0.4** with `@vitejs/plugin-react` **^6.0.1** (`landing-page-onco/package.json`).
- **React 19** — Dashboard `^19.0.0`; landing `^19.2.4`; mobile pinned `19.1.0` (see respective `package.json` files).
- **Express ^4.21.2** — HTTP API in `backend/src/index.ts` (mounts OCR, agent, WhatsApp, Evolution webhook, exams, FHIR, support routes).

**Testing:**
- **Vitest ^3.0.5** — Backend unit tests (`backend/package.json` → `npm run test`); TypeScript excludes `*.test.ts` from `backend/tsconfig.json` build output.

**Build/Dev:**
- **TypeScript** — `backend` **~5.8.2** (`backend/package.json`); `mobile` **~5.9.2**; `hospital-dashboard` **~5.7.2**; `landing-page-onco` **~6.0.2** (each package pins independently).
- **tsx ^4.19.3** — Dev/watch for backend (`backend/package.json` scripts: `dev`, `dev:tsx`).
- **ESLint 9** + **typescript-eslint** — Dashboard and landing (`hospital-dashboard/package.json`, `landing-page-onco/package.json`).

## Key Dependencies

**Critical (backend — `backend/package.json`):**
- `@supabase/supabase-js ^2.49.1` — Auth validation and DB from `backend/src/supabase.ts`, `backend/src/authMiddleware.ts`, route handlers.
- `@google/generative-ai ^0.21.0` — Gemini client; used from modules such as `backend/src/gemini.ts`, `backend/src/ocrGemini.ts`, `backend/src/agentService.ts`.
- `openai ^6.34.0` — Support chat and OCR fallback (`backend/src/supportOpenAi.ts`, `backend/src/ocrOpenAi.ts`).
- `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` — S3-compatible access to **Cloudflare R2** (`backend/src/r2.ts`).
- `zod ^3.24.2` — Request validation (e.g. `backend/src/index.ts` uses `z` for bodies).
- `helmet`, `cors`, `express-rate-limit` — Security and abuse controls in `backend/src/index.ts`.

**Critical (mobile — `mobile/package.json`):**
- `@supabase/supabase-js ^2.103.0` — Client-side data layer.
- `@tanstack/react-query ^5.97.0` — Async/server state.
- `expo-*` modules — Notifications, print, sharing, secure store, image picker, document picker, etc. (full list in `mobile/package.json`).
- `@sentry/react-native ~7.2.0` — Error monitoring in production builds.
- `@kingstinct/react-native-healthkit ^14.0.0` — Apple HealthKit integration (iOS).

**Critical (hospital-dashboard — `hospital-dashboard/package.json`):**
- `@supabase/supabase-js ^2.103.0` — Staff SPA data access.
- `react-router-dom ^7.14.0` — Client routing.
- `@radix-ui/react-*` — Accessible primitives (avatar, progress, scroll-area, slot, tooltip).
- `recharts`, `framer-motion` — Charts and motion.

**Infrastructure:**
- **Supabase CLI** — Local project defined in `supabase/config.toml` (`project_id = "aura-onco"`, Postgres **major_version = 17**).
- **EAS CLI** — Invoked via `npx eas-cli@^18.7.0` from `mobile/package.json` for Android builds/submit.

**Shared package:**
- `shared/package.json` — Placeholder only (`private`, `"type": "module"`) with **no runtime dependencies**; not a published library in the current tree.

## Configuration

**Environment:**
- **Root** — `.env.example` documents optional shared vars (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, R2, etc.) for workflows that load from repo root; **do not commit real `.env`**.
- **Backend** — `backend/.env.example` is the canonical list for Express (`PORT`, Supabase keys, Gemini/OpenAI, R2, Meta WhatsApp, Evolution, `MESSAGING_PROVIDER`, `CORS_ORIGINS`). Loaded via `backend/src/config.ts` / `loadEnv()` from `backend/src/index.ts`.
- **Hospital dashboard** — `hospital-dashboard/.env.example`: `VITE_SUPABASE_*`, `VITE_BACKEND_URL`.
- **Mobile** — `EXPO_PUBLIC_*` vars documented in `mobile/README.md` and wired through `mobile/app.config.js` (see repo; not read here in full).

**Build:**
- **Backend** — `backend/tsconfig.json`: `target` ES2022, `module`/`moduleResolution` NodeNext, `outDir` `dist`, `rootDir` `src`. Production entry: `node dist/index.js` (`backend/package.json` → `start`).
- **Supabase** — `supabase/config.toml` (API port 54321, DB 54322, Studio 54323, Realtime enabled, Storage enabled, seed `supabase/seed.sql`).
- **Vite** — Per-app: `hospital-dashboard/vite.config.ts`, `landing-page-onco/vite.config.ts` (paths inferred from standard Vite layout; config files exist alongside `package.json`).

## Platform Requirements

**Development:**
- **Node 22** recommended to match `.github/workflows/ci.yml` (backend test+build, mobile typecheck, dashboard build).
- **npm ci** — CI installs from each package lockfile; run `npm install` locally per app directory.
- **Supabase CLI** — For local stack and migrations (`supabase/README.md`).
- **Android SDK / Xcode** — For native mobile runs (`mobile/README.md`).

**Production:**
- **Supabase Cloud** — Hosted Postgres, Auth, Storage, Realtime, Edge Functions (Deno).
- **Node host** — For `backend` (Express); must set `NODE_ENV=production` and **`CORS_ORIGINS`** (enforced at startup in `backend/src/index.ts`).
- **Expo / EAS** — Mobile distribution (`mobile/package.json` EAS scripts).
- **Static hosting** — Vite build output for `hospital-dashboard` and `landing-page-onco` (no Supabase coupling in landing per root `README.md` architecture diagram).

---

*Stack analysis: 2026-04-20*
