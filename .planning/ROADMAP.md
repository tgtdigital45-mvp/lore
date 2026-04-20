# Roadmap: Aura Onco (GSD)

**Created:** 2026-04-20  
**Granularity:** Standard (YOLO)  
**Source:** `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/codebase/CONCERNS.md`

## Overview

| Phase | Name | Goal | Requirements | Success criteria (observable) |
|-------|------|------|----------------|------------------------------|
| 1 | Backend webhooks & telefone | Webhooks seguros e lookup escalável | API-01, API-02, API-03 | 1) Documento ou teste descreve estratégia de índice/RPC para telefone. 2) Uma função partilhada de normalização usada em ambas as rotas. 3) Checklist de auth webhook assinada no README ou `docs/`. |
| 2 | Dashboard UX | Um fluxo de dossiê sem duplicação modal | DASH-01, DASH-02 | 1) Nenhuma rota ativa monta `PatientModal` OU está marcado como arquivo com ADR curto. 2) CONTRIBUTING ou doc aponta o fluxo canónico. |
| 3 | Qualidade dados | RLS + testes + gates release | DATA-01, QUAL-01, QUAL-02 | 1) Teste RLS smoke passa em CI ou script documentado. 2) Maestro ou equivalente documentado como gate. 3) Novos handlers críticos têm teste Vitest. |
| 4 | Mobile foundations | Deep link + a11y backlog | MOBL-01, MOBL-02 | 1) Doc de deep links com exemplos de URL. 2) Lista priorizada de issues a11y com ficheiros. |
| 5 | Docs & handover | Onboarding GSD | DOCS-01 | README ou RELATORIO liga `.planning/` e próximo comando GSD. |

## Phase 1: Backend webhooks & telefone

**Goal:** Reduzir risco P0/P1 em `evolutionWebhook.ts` e alinhar WhatsApp/Evolution.

**Requirements:** API-01, API-02, API-03

**UI hint:** no

**Success criteria:**

1. Estratégia de resolução de paciente por telefone não depende de `.limit(3000)` em memória como estado final (migração SQL ou RPC documentada).
2. Variáveis de ambiente e verificação HMAC/webhook descritas para operadores.
3. Helpers de telefone consolidados num módulo importado pelas duas rotas.

## Phase 2: Dashboard UX

**Goal:** Eliminar confusão entre `PatientModal` e `PatientDossierPage`.

**Requirements:** DASH-01, DASH-02

**UI hint:** yes

**Success criteria:**

1. Código morto ou arquivo explícito; build sem referências acidentais.
2. Secção curta em `hospital-dashboard/README.md` (ou doc) com fluxo canónico.

## Phase 3: Qualidade dados

**Goal:** Confiança em RLS e pipeline de release.

**Requirements:** DATA-01, QUAL-01, QUAL-02

**UI hint:** no

**Success criteria:**

1. Teste ou job verificável para RLS.
2. Documentação de gate E2E/Maestro.
3. Pelo menos um novo teste para handler crítico escolhido em Phase 1.

## Phase 4: Mobile foundations

**Goal:** Deep links e dívida a11y visível.

**Requirements:** MOBL-01, MOBL-02

**UI hint:** yes

**Success criteria:**

1. Doc de deep linking com exemplos.
2. Backlog a11y priorizado com paths.

## Phase 5: Docs & handover

**Goal:** Equipa encontra GSD e `.planning/` no onboarding.

**Requirements:** DOCS-01

**UI hint:** no

**Success criteria:**

1. Link explícito em README ou RELATORIO para `.planning/` e comando seguinte (`/gsd-discuss-phase 1`).

---

## Requirement coverage

Todos os requisitos v1 em `REQUIREMENTS.md` estão mapeados a exatamente uma fase (tabela de traceability).

---
*Roadmap created: 2026-04-20*
