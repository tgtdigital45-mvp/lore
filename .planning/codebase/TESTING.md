# Testing Patterns

**Analysis Date:** 2026-04-20

## Test Framework

**Runner:**
- **Vitest** `^3.0.5` — only declared in `backend/package.json`.
- **No** `vitest.config.ts` / `vitest.config.mts` at repo root or under `backend/`; defaults apply (Node environment, `src/**/*.test.ts` discovered when running from `backend/`).

**Assertion library:**
- Vitest built-in `expect`, `describe`, `it` imported explicitly: `import { describe, expect, it } from "vitest";`.

**Run commands:**
```bash
cd backend && npm run test    # vitest run — all unit/integration tests in backend
cd backend && npx vitest      # interactive / watch (local dev)
```

**Build vs tests:**
- `backend/tsconfig.json` excludes `src/**/*.test.ts` from `tsc` emit so tests do not ship in `dist/`; CI still runs `npm run test` before `npm run build` (see `.github/workflows/ci.yml`).

## Test File Organization

**Location:**
- Co-located with source under `backend/src/` — suffix `*.test.ts` (not a separate `__tests__` tree).

**Naming:**
- `evolutionWebhook.test.ts` pairs with `evolutionWebhook.ts`.
- `metaWebhookSignature.test.ts`, `nadirFeverRules.test.ts` — pure logic / crypto / parsing.
- `supabaseRls.integration.test.ts` — optional integration against live Supabase.

**Structure:**
```
backend/src/
├── *.ts                 # implementation
├── *.test.ts            # Vitest suites beside implementations
└── *.integration.test.ts # gated integration (env required)
```

## Test Structure

**Suite organization:**
```typescript
import { describe, expect, it } from "vitest";

describe("featureName", () => {
  it("behaviour in plain language (PT or EN)", () => {
    expect(...).toBe(...);
  });
});
```

**Patterns:**
- **Fixtures:** Inline `const` objects at top of file (e.g. `messagesUpsertPayload` in `backend/src/evolutionWebhook.test.ts`) documenting real webhook shape.
- **Cloning:** `structuredClone` for variant payloads in the same file.
- **Conditional suites:** `describe.skipIf(!run)("Supabase RLS (integração)", () => { ... })` in `backend/src/supabaseRls.integration.test.ts` when `SUPABASE_URL` / `SUPABASE_ANON_KEY` (or `VITE_*` mirrors) are unset — **tests skip instead of failing** so local/CI without secrets stays green.
- **Prescriptive:** Integration tests that need cloud projects must document required env vars in the file header and use `skipIf`, not hard failures, unless a dedicated CI job injects secrets.

## Mocking

**Framework:** None configured (no `@vitest/spy` examples in sampled files); tests are mostly pure functions and crypto verification.

**Patterns:**
- Prefer deterministic inputs and golden expectations (`metaWebhookSignature.test.ts` style) over network mocks until a mocking baseline is added.

**What to mock (when adding tests):**
- External HTTP (Gemini, OpenAI, WhatsApp Graph) and Supabase admin clients — not currently isolated in unit tests; production code paths are exercised manually or via integration.

**What NOT to mock:**
- Pure parsers and rules (`extractEvolutionInboundMessages`, temperature extraction) — keep as fast unit tests without I/O.

## Fixtures and Factories

**Test data:** Declared as `const` objects in test files; no central `fixtures/` folder for backend.

**Location:** Same file as suite for readability.

## Coverage

**Requirements:** No enforced coverage threshold in CI or `package.json` scripts.

**View coverage (if introduced later):**
```bash
cd backend && npx vitest run --coverage
```
(Vitest coverage provider would need to be added as a devDependency — **not present today**.)

## Test Types

**Unit tests:**
- `backend/src/evolutionWebhook.test.ts`, `metaWebhookSignature.test.ts`, `nadirFeverRules.test.ts` — no network, fast, run in default CI backend job.

**Integration tests:**
- `backend/src/supabaseRls.integration.test.ts` — requires real Supabase project env; skipped when vars missing.

**E2E tests:**
- **Maestro** (mobile UI). Two entry points exist:
  - **Repo suite (documented):** `.maestro/main.yaml` orchestrates `flows/*.yaml` — run from repo root: `maestro test .maestro/main.yaml` (see `.maestro/README.md`).
  - **Package script:** `mobile/package.json` → `npm run e2e:maestro` runs `maestro test maestro/smoke.yaml` (relative to `mobile/`) — minimal smoke (`launchApp` + optional visibility waits). File: `mobile/maestro/smoke.yaml`.
- **Prerequisites:** App installed with `appId: com.auraonco.app`; optional `AURA_TEST_EMAIL` / `AURA_TEST_PASSWORD` for login flows per `.maestro/README.md`.

## Frontend / mobile unit tests

**React Native (Expo):** `react-test-renderer` is a devDependency in `mobile/package.json` but **no** `*.test.tsx` files were found under `mobile/`. **Gap:** screens and hooks lack automated unit/UI tests.

**Vite apps (`hospital-dashboard`, `landing-page-onco`):** No Vitest/Jest dependency and no `*.test.*` files detected. **Gap:** UI and routing untested by automation.

## CI (`.github/workflows/ci.yml`)

**What runs today:**
| Job | Working directory | Steps |
|-----|-------------------|--------|
| `backend` | `backend/` | `npm ci` → `npm run test` (Vitest) → `npm run build` |
| `mobile` | `mobile/` | `npm ci` → `npm run typecheck` only |
| `hospital-dashboard` | `hospital-dashboard/` | `npm ci` → `npm run build` (includes `tsc -b`) |

**Not in CI:**
- `npm run lint` for Vite projects (scripts exist but workflow does not call them).
- Maestro E2E (no emulator orchestration, no `maestro test` step).
- `landing-page-onco` package (no job — **gap** if landing regressions matter).

## Common Patterns

**Async testing:**
```typescript
it("cliente anónimo não lê pacientes sem sessão", async () => {
  const sb = createClient(url!, anon!);
  const { data, error } = await sb.from("patients").select("id").limit(1);
  expect(error).toBeNull();
  expect((data ?? []).length).toBe(0);
});
```
(Source: `backend/src/supabaseRls.integration.test.ts`.)

**Skip when misconfigured:**
```typescript
const run = Boolean(url && anon);
describe.skipIf(!run)("Supabase RLS (integração)", () => { ... });
```

## Gaps and priorities

1. **Mobile:** Add component/hook tests (React Native Testing Library + Vitest or Jest per Expo docs) starting with `src/lib/` and critical hooks under `mobile/src/hooks/`.
2. **Dashboard / landing:** Add Vitest + RTL (or Playwright for smoke) and wire `npm run test` + CI job.
3. **Lint in CI:** Run `hospital-dashboard` / `landing-page-onco` `npm run lint` to catch hook dependency issues pre-merge.
4. **Maestro in CI:** Requires Android emulator or device farm; document as optional until infrastructure exists; align on single entry (`main.yaml` vs `mobile/maestro/smoke.yaml`) to avoid drift.
5. **Backend coverage:** Optional integration tests for OCR/agent routes behind feature flags or recorded HTTP fixtures to avoid flaky live AI calls.

---

*Testing analysis: 2026-04-20*
