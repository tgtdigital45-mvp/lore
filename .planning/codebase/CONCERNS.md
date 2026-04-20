# Codebase Concerns

**Analysis Date:** 2026-04-20

## Priority summary (highest first)

| Priority | Theme | Primary files |
|----------|--------|----------------|
| P0 | Evolution inbound patient lookup does not scale | `backend/src/evolutionWebhook.ts` |
| P1 | Webhook authentication and transport | `backend/src/evolutionWebhook.ts`, `backend/src/config.ts` |
| P1 | Large JSON payloads on API surface | `backend/src/index.ts` |
| P2 | Monolithic UI and deprecated parallel flows | `hospital-dashboard/src/pages/PatientDossierPage.tsx`, `hospital-dashboard/src/components/patient/PatientModal.tsx` |
| P2 | Authorization helper query pattern | `backend/src/fhirRoutes.ts` |
| P2 | Duplicated phone-normalization logic | `backend/src/whatsappRoutes.ts`, `backend/src/evolutionWebhook.ts` |
| P3 | Stub/heuristic “clinical” automation | `supabase/functions/risk-projection-stub/index.ts` |
| P3 | Test coverage concentrated in backend | `backend/src/*.test.ts`, `backend/src/*.integration.test.ts` |

---

## Tech Debt

**Evolution inbound: full-table scan pattern for phone match**

- Issue: `findPatientByPhoneDigits` loads up to 3000 `patients` rows with nested `profiles` and matches digits in application memory on every inbound message batch.
- Files: `backend/src/evolutionWebhook.ts`
- Impact: Latency and CPU grow with tenant size; risk of missed matches if `.limit(3000)` truncates; costly under webhook bursts.
- Fix approach: DB-side lookup (indexed expression on `phone_e164`, RPC, or materialized digits column), or queue + worker with bounded concurrency.

**Deprecated hospital modal still in tree**

- Issue: `PatientModal` is explicitly deprecated but remains with lazy tab panels; duplicates concepts now on `PatientDossierPage`.
- Files: `hospital-dashboard/src/components/patient/PatientModal.tsx`
- Impact: Confusing for contributors; larger bundle if imported accidentally; two UX paths to maintain.
- Fix approach: Remove exports/usages or isolate under `_archive/` after confirming no route still mounts it.

**Duplicate phone digit normalization**

- Issue: `digitsOnly` in WhatsApp routes vs `digitsFromE164` in Evolution webhook — same intent, two implementations.
- Files: `backend/src/whatsappRoutes.ts`, `backend/src/evolutionWebhook.ts`
- Impact: Subtle formatting bugs if one path changes.
- Fix approach: Single shared helper (e.g. `backend/src/phoneDigits.ts`) with unit tests.

---

## Known Bugs

**Not detected** via `TODO`/`FIXME` scans in `*.ts`/`*.tsx` (no literal markers found). Operational issues may still exist; track via Sentry/logs and UAT.

---

## Security Considerations

**Evolution webhook secret in query string**

- Risk: `?secret=` appears in access logs, proxies, and browser tooling; easier to leak than header-based secrets.
- Files: `backend/src/evolutionWebhook.ts`, `backend/src/config.ts`, `backend/.env.example` (documentation only — do not commit real values)
- Current mitigation: Constant-time comparison not applicable to query strings; rejection when unset; instance UUID filter when configured (`shouldProcessEvolutionWebhook`).
- Recommendations: Prefer `X-Webhook-Secret` (or HMAC of raw body) and document log redaction; rotate secret if logs are broadly retained.

**Service role usage on backend**

- Risk: `createServiceSupabase` bypasses RLS for inserts/updates (e.g. outbound messages, Evolution inbound). Mis-routing or missing checks could widen blast radius.
- Files: `backend/src/supabase.ts`, `backend/src/whatsappRoutes.ts`, `backend/src/evolutionWebhook.ts`
- Current mitigation: WhatsApp send path re-checks `staff_assignments`, opt-in, and patient ownership with user-scoped client before using admin client.
- Recommendations: Audit every `admin.from(` call; keep inserts minimal; avoid passing user-controlled `hospital_id` without revalidation where applicable.

**Cron / internal Edge Functions**

- Risk: Shared `CRON_SECRET` bearer pattern; compromise grants service-role data access in functions.
- Files: `supabase/functions/_shared/cronAuth.ts`, `supabase/functions/risk-projection-stub/index.ts`, `supabase/functions/appointment-reminders/index.ts`, `supabase/functions/medication-reminders/index.ts`, `supabase/functions/treatment-reminders/index.ts`, `supabase/functions/patient-link-notify/index.ts`, `supabase/functions/requires-action-webhook/index.ts`, `supabase/functions/pro-questionnaire-dispatch/index.ts`
- Current mitigation: Minimum secret length 16; 401 on mismatch.
- Recommendations: Strong random secret in vault; optional IP allowlist for Supabase cron invokers; per-function tokens if requirements diverge.

**PHI in webhook persistence**

- Risk: `raw_payload` stores full Evolution payload alongside clinical messaging context.
- Files: `backend/src/evolutionWebhook.ts`, migration `supabase/migrations/20260619160000_whatsapp_inbound_messages.sql`
- Current mitigation: RLS on `whatsapp_inbound_messages` for staff reads (see migration).
- Recommendations: Retention policy, column minimization, or encryption-at-rest review per compliance target.

---

## Performance Bottlenecks

**Evolution webhook patient resolution**

- Problem: See Tech Debt — O(n) scan up to hard cap per webhook.
- Files: `backend/src/evolutionWebhook.ts`
- Cause: No indexed phone lookup path.
- Improvement path: SQL/RPC indexed by normalized phone digits.

**FHIR Observation bundle assembly**

- Problem: Up to 100 symptom logs plus follow-up query for AE rows — acceptable for 100 rows but `staffMayAccessPatient` may issue multiple sequential queries per request.
- Files: `backend/src/fhirRoutes.ts`
- Cause: Loop over `patient_hospital_links` with per-link `staff_assignments` lookups.
- Improvement path: Single RPC or join query returning boolean; cache hospital access per session if call volume grows.

**Global JSON body limit**

- Problem: `express.json` limit `25mb` applies broadly (OCR/staff paths need large payloads; most routes do not).
- Files: `backend/src/index.ts`
- Cause: Single middleware configuration.
- Improvement path: Route-specific parsers with tighter defaults on non-upload routes.

---

## Fragile Areas

**RLS + staff OCR error surface**

- Files: `backend/src/index.ts` (explicit handling of `42501` / RLS messages for staff OCR)
- Why fragile: Depends on Postgres error codes and message text from Supabase client.
- Safe modification: Prefer typed domain errors from a service layer; add integration tests when changing `staff_assignments` or patient write policies.
- Test coverage: `backend/src/supabaseRls.integration.test.ts` exists — extend when adding new staff write paths.

**Evolution payload shapes**

- Files: `backend/src/evolutionWebhook.ts` (`extractEvolutionInboundMessages`, `pushFromMessageNode`)
- Why fragile: Baileys/Evolution schema drift can silently drop messages.
- Safe modification: Expand fixtures in `backend/src/evolutionWebhook.test.ts` when upgrading Evolution; monitor `evolution_inbound_no_patient` / `evolution_inbound_insert_failed` logs.

**Meta vs Evolution dual provider**

- Files: `backend/src/whatsappRoutes.ts`, `backend/src/messagingProvider.js` (if present — verify name)
- Why fragile: Configuration matrix (`MESSAGING_PROVIDER`, Meta tokens, Evolution keys) is easy to misconfigure in staging.
- Safe modification: Startup validation logs (already partially present); runbook in `backend/README.md`.

---

## Scaling Limits

**Evolution inbound lookup cap (`limit(3000)`)**

- Current capacity: Hard-coded fetch window.
- Limit: Wrong patient match or no match when more than cap or phone not in window.
- Scaling path: Remove cap via proper indexed query.

**Rate limiting**

- Current: `agentLimiter` on several user-authenticated routes in `backend/src/index.ts`.
- Limit: `mountEvolutionWebhook` is mounted without the same limiter — public POST once secret is known is abuse-capable (DoS, log noise).
- Scaling path: Dedicated low-cost rate limiter or network-level protection (WAF) on `/api/evolution/webhook`.

---

## Dependencies at Risk

**Not detected** as outdated or deprecated in this pass (no `npm audit` / lockfile diff run). Re-run dependency audit in CI before releases.

---

## Missing Critical Features

**Risk projection naming**

- Problem: Function folder `risk-projection-stub` documents heuristic behavior; consumers may treat output as clinical-grade risk.
- Blocks: Safe clinical decision support without human review.
- Files: `supabase/functions/risk-projection-stub/index.ts`

---

## Test Coverage Gaps

**Mobile and hospital-dashboard**

- What's not tested: No `*.test.ts(x)` matches under `mobile/` or `hospital-dashboard/` in repository scan.
- Files: Broad — e.g. `mobile/src/auth/AuthContext.tsx`, `hospital-dashboard/src/pages/PatientDossierPage.tsx`
- Risk: Regressions in auth flows, dossier tabs, and messaging UI ship without automated guard.
- Priority: High for PHI-adjacent flows; Medium for pure presentation.

**Backend**

- What is tested: `backend/src/metaWebhookSignature.test.ts`, `backend/src/evolutionWebhook.test.ts`, `backend/src/nadirFeverRules.test.ts`, `backend/src/supabaseRls.integration.test.ts`
- Risk: Large surface in `backend/src/agentService.ts`, `backend/src/ocrService.ts`, `backend/src/examHandlers.ts` lacks co-located tests (verify if added later).
- Priority: Medium — expand as those modules change.

---

*Concerns audit: 2026-04-20*
