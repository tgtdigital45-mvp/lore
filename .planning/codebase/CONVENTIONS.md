# Coding Conventions

**Analysis Date:** 2026-04-20

## Naming Patterns

**Files:**
- Backend: kebab-free module names in `camelCase` or single word (`evolutionWebhook.ts`, `index.ts`, `nadirFeverRules.ts`). Tests co-located as `*.test.ts` beside implementation in `backend/src/`.
- Mobile (Expo Router): route files use Expo conventions — `app/(tabs)/index.tsx`, dynamic segments `[cycleId].tsx`, grouped routes in parentheses directories under `mobile/app/`.
- Hospital dashboard / landing: React components often PascalCase files under `hospital-dashboard/src/` and `landing-page-onco/src/` (e.g. `FhirExportButton.tsx`).

**Functions:**
- Use `camelCase` for functions and variables across TypeScript packages (`loadEnv`, `getApiBaseUrl`, `logStructured`).
- Express route handlers are anonymous `async (req, res) =>` blocks in `backend/src/index.ts` and mounted routers (`mountWhatsappRoutes`, `mountEvolutionWebhook`).

**Variables:**
- `camelCase` for locals and parameters. Environment-backed values often named `env` after `loadEnv()` in `backend/src/index.ts`.
- Portuguese user-facing strings are common in API JSON `message` / `reply` fields and mobile UI copy (product language).

**Types:**
- Prefer `type` aliases from Zod inference: `export type Env = z.infer<typeof envSchema>` in `backend/src/config.ts`.
- Import `type` keyword where used (e.g. `import express, { type Request } from "express"` in `backend/src/index.ts`).

## Code Style

**Formatting:**
- No repository-root Prettier or Biome config detected. Formatting is implicit (editor defaults / team habit).
- **Prescriptive:** When adding shared formatting, prefer a single root config or align `hospital-dashboard` and `landing-page-onco` first (both Vite + ESLint).

**Linting:**
- **ESLint** is configured only for Vite SPAs:
  - `hospital-dashboard/eslint.config.js` — flat config, `@eslint/js`, `typescript-eslint` recommended, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, browser `globals`.
  - `landing-page-onco/eslint.config.js` — same stack using `eslint/config` `defineConfig` + `reactRefresh.configs.vite`.
- **Backend** and **mobile** have no ESLint scripts in `package.json`; rely on TypeScript compiler strictness.
- Run lint where available: `npm run lint` from `hospital-dashboard/` or `landing-page-onco/` (see each `package.json`).

**TypeScript compiler strictness:**
- `backend/tsconfig.json`: `strict`, `target` ES2022, `module`/`moduleResolution` NodeNext, `rootDir`/`outDir` for emit; tests excluded from program via `"exclude": ["src/**/*.test.ts"]`.
- `mobile/tsconfig.json`: `strict`, `extends` `expo/tsconfig.base`, path alias `@/*` → `./*`.
- `hospital-dashboard/tsconfig.app.json`: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`, `jsx: react-jsx`, `moduleResolution: bundler`.
- `landing-page-onco/tsconfig.app.json`: stricter style flags including `verbatimModuleSyntax`, `erasableSyntaxOnly`, unused checks (no `strict` key duplicated — inherits from parent reference chain).

## Import Organization

**Order (observed):**
1. Node / third-party packages (`express`, `zod`, `@tanstack/react-query`).
2. Internal absolute aliases (`@/src/...`, `@/app/...`) on mobile.
3. Relative imports for same-package modules (`./config.js`, `./logger.js`).

**Path aliases:**
- Mobile: `@/*` maps to repo-relative paths under `mobile/` per `mobile/tsconfig.json` — use for all new screens and libs (see `mobile/app/_layout.tsx` imports).
- Hospital dashboard: `@/*` → `./src/*` per `hospital-dashboard/tsconfig.json` / `tsconfig.app.json`.

**Node ESM extension rule (backend):**
- Source files live as `.ts` but imports use **`.js` suffix** for local modules (e.g. `from "./evolutionWebhook.js"` in `backend/src/evolutionWebhook.test.ts`). This matches NodeNext emit and avoids broken resolution after `tsc`.
- **Prescriptive:** New backend modules must follow the same `import { x } from "./foo.js"` pattern.

## Error Handling

**Backend API (`backend/src/index.ts` and route modules):**
- **Validation:** Request bodies parsed with Zod `.safeParse`; on failure call `logValidationError` and respond `400` with `{ error: "invalid_request", message: "..." }` (Portuguese user-safe text).
- **Domain / guard errors:** Map known conditions to HTTP status + small JSON payload (e.g. `OcrRejectedNotMedical` → `422`, `patient_not_found` → `404`, `forbidden` / RLS → `403`).
- **Unexpected errors:** `try/catch`, `logStructured("<event>_failed", { err: ... })`, respond `500` with `error` code and non-technical `message` / `reply` (especially for clinical-adjacent copy on agent routes).
- **Downstream HTTP:** WhatsApp Graph failures logged and surfaced as `502` with stable `error` keys (`whatsapp_send_failed`, `whatsapp_network_error`) in `backend/src/whatsappRoutes.ts`.

**Prescriptive:** Prefer stable `error` string codes for clients; keep human text in `message`/`reply` fields for dashboards and mobile.

## Logging

**Framework:** Plain `console` wrapped by helpers.

**Patterns:**
- Use `logStructured(event, fields)` from `backend/src/logger.ts` for one-line JSON logs (`ts`, `event`, arbitrary fields).
- Dev-only warnings in Vite apps: `if (import.meta.env.DEV) { console.warn(...) }` (e.g. `hospital-dashboard/src/lib/supabase.ts`).

## Environment Handling

**Backend (`backend/src/config.ts`, `backend/src/index.ts`):**
- `loadDotenvFiles()` merges multiple `.env` file paths (repo root, `backend/.env`, cwd variants). **Do not commit secrets**; existence of `.env` is documented in `backend/README.md` / `backend/.env.example` only.
- `loadEnv()` validates `process.env` with **Zod** `envSchema`; invalid config throws after printing flatten hints — fail-fast at process start.
- Dev server: `node --watch --env-file=.env --import tsx` (see `backend/package.json`) loads env via Node as well as dotenv merge.

**Mobile (`mobile/src/lib/apiConfig.ts`, `mobile/src/lib/supabase.ts`, `mobile/src/lib/sentry.ts`):**
- Public env vars must use **`EXPO_PUBLIC_*`** so Metro inlines them (documented in code comments).
- **`expo.extra`** from `app.config` / `app.json` overrides or supplements env (API URL resolution order is explicit in `getApiBaseUrl()`).
- Optional Sentry: `EXPO_PUBLIC_SENTRY_DSN` (trimmed) in `mobile/src/lib/sentry.ts`.

**Vite dashboards (`hospital-dashboard/`, `landing-page-onco/`):**
- Use **`import.meta.env.VITE_*`** only (e.g. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BACKEND_URL` in `hospital-dashboard/src/lib/supabase.ts` and `hospital-dashboard/src/lib/backendUrl.ts`).
- Gate noisy diagnostics with `import.meta.env.DEV`.

**Prescriptive:** Never read raw `process.env` for secrets on the client; server-only keys stay in backend Zod schema only.

## Comments

**When to comment:**
- Non-obvious integration contracts (Evolution webhook payload shape, RLS test prerequisites) — see headers in `backend/src/evolutionWebhook.test.ts` and `backend/src/supabaseRls.integration.test.ts`.
- Mobile root layout documents font-loading pitfalls (`mobile/app/_layout.tsx`).

**JSDoc/TSDoc:**
- Module-level `/** ... */` for public helpers and env resolution (`mobile/src/lib/apiConfig.ts`). Not required on every private function.

## Function Design

**Size:** Route handlers in `index.ts` are large; new endpoints should prefer extracting logic to `*Service.ts` / `*Routes.ts` files (existing pattern: `whatsappRoutes.ts`, `fhirRoutes.ts`, `examHandlers.ts`).

**Parameters:** Express `(req, res)`; validated body passed as typed object after Zod parse.

**Return values:** Handlers send via `res.status().json()` and `return;` early — avoid falling through after response.

## Module Design

**Exports:** Named exports for utilities and `mount*` functions; default export for Expo Router screens and root `layout`.

**Barrel files:** Not heavily used; import from concrete modules (`@/src/lib/queryClient`).

## React / Expo Patterns

**Provider tree:** Root layout wraps `QueryClientProvider`, auth and patient contexts, error boundary, safe area, gesture handler (`mobile/app/_layout.tsx`). **Prescriptive:** New global state or data clients go inside this tree in dependency order (outer: gesture/safe area → error boundary → React Query → domain providers).

**Data fetching:** TanStack React Query (`queryClient` from `mobile/src/lib/queryClient.ts`); invalidate via `useQueryClient()` where mutations affect lists (e.g. `mobile/app/signup.tsx`, `mobile/src/home/ProfileSheet.tsx`).

**Hooks:** Standard React hooks; side effects in `useEffect` with explicit dependency arrays. Custom hooks live under `mobile/src/hooks/` (e.g. `usePushTokenRegistration`, `usePatientLinkNotificationRoutes`).

---

*Convention analysis: 2026-04-20*
