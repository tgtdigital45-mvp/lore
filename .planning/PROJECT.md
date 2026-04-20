# Aura Onco (OncoCare)

## What This Is

**Aura Onco** é um monorepo de **acompanhamento oncológico** (“um dia de cada vez”): app **Expo** para paciente, **dashboard Vite** para equipa hospitalar, **API Express** para rotas sensíveis (OCR, LLM, ficheiros, WhatsApp Meta/Evolution), **Supabase** (Postgres, RLS, Auth, Storage, Realtime, Edge Functions) e **landing** de marketing. Orientação **SaMD**: IA para suporte e triagem estruturada, **sem diagnóstico automático**.

## Core Value

O dossiê clínico do dia a dia (sintomas, medicamentos, tratamento, exames, calendário, relatórios) chega **completo e consentido** ao cuidado hospitalar, com **dados protegidos por RLS** e integrações **auditáveis**.

## Requirements

### Validated

- ✓ **Autenticação Supabase (JWT)** em mobile, dashboard e rotas Express com Bearer — existente (`mobile/src/lib/supabase.ts`, `hospital-dashboard/src/lib/supabase.ts`, `backend/src/authMiddleware.ts`).
- ✓ **RLS e migrações Postgres** como fonte de verdade — existente (`supabase/migrations/`).
- ✓ **App paciente (Expo Router)** — diário, medicamentos, tratamento, exames, calendário, PDFs, vínculo hospital — existente (`mobile/app/`, `mobile/src/`).
- ✓ **Dashboard hospitalar** — triagem, dossiê, agenda, mensagens, settings — existente (`hospital-dashboard/src/`).
- ✓ **Backend Express** — OCR, agentes (Gemini), suporte (OpenAI), R2, WhatsApp, webhooks, FHIR — existente (`backend/src/index.ts` e módulos).
- ✓ **Edge Functions** — lembretes, relatórios, PRO, segredos `CRON_SECRET` onde aplicável — existente (`supabase/functions/`).
- ✓ **Módulos partilhados** — lógica clínica reutilizável — existente (`shared/`).

### Active

*(Ordem GSD acordada: dashboard e qualidade primeiro; API/webhooks por último — ver `.planning/ROADMAP.md`.)*

- [ ] **Consolidação UX dashboard** — remover/encerrar `PatientModal` duplicado vs `PatientDossierPage` (**Phase 1**).
- [ ] **Cobertura de testes** — E2E Maestro, testes RLS smoke, Vitest em rotas críticas não-webhook (**Phase 2**).
- [ ] **Mobile** — deep linking documentado, backlog a11y priorizado (**Phase 3**).
- [ ] **Onboarding docs** — README/RELATORIO ligam `.planning/` e fluxo GSD (**Phase 4**).
- [ ] **Lookup Evolution/WhatsApp** escalável por telefone e normalização única (**Phase 5 — futuro próximo**; `evolutionWebhook.ts`, `whatsappRoutes.ts`).
- [ ] **Operação** — Realtime filtrado por hospital, métricas agregadas, cron de consultas (roadmap legado em `TODO_MASTER.md`).

### Out of Scope

- **Substituir Supabase por outra BD** — ecossistema e RLS estão acoplados ao produto.
- **Diagnóstico ou prescrição automática por IA** — princípio clínico explícito no README e em `docs/diretrizes-corportamento.md`.

## Context

- Monorepo **sem `package.json` na raiz**; pacotes em `mobile/`, `hospital-dashboard/`, `backend/`, `landing-page-onco/`.
- **Mapa de codebase GSD:** `.planning/codebase/` (STACK, ARCHITECTURE, STRUCTURE, INTEGRATIONS, CONVENTIONS, TESTING, CONCERNS).
- **Relatório de produto:** `docs/RELATORIO-PROJETO.md` — síntese PRD, arquitetura, integrações, roadmap legado.
- **Integrações:** Gemini, OpenAI, WhatsApp Cloud, Evolution, R2, Expo Push (ver `README.md` e INTEGRATIONS.md).

## Constraints

- **Regulamentação / risco:** dados de saúde — LGPD, políticas em `docs/politicas-compliance.md`, `docs/SECURITY.md`.
- **Stack:** Node 20+ (CI Node 22), TypeScript, Supabase obrigatório para dados paciente com RLS.
- **Segurança:** webhooks com verificação de assinatura; não commitar `.env` com segredos reais.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| RLS-first + Express para segredos | Separar CRUD cliente vs chaves servidor e pipelines binários | ✓ Good |
| GSD como camada de planeamento | `.planning/` para roadmap executável alinhado ao código | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):

1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):

1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-21 — prioridade Active alinhada ao roadmap (API em última fase)*  
*Previous: 2026-04-20 after GSD `/gsd-new-project` bootstrap*
