# TODO MASTER - PROJETO ONCO

## CRÍTICO (concluído)

- [x] Verificação `X-Hub-Signature-256` no webhook WhatsApp
- [x] CORS configurável (`CORS_ORIGINS`); em **`NODE_ENV=production`** o backend **termina ao iniciar** se `CORS_ORIGINS` estiver vazio (obrigatório definir origens)
- [x] Documentar / ativar leaked password protection (Supabase Dashboard) — ver [docs/SECURITY.md](docs/SECURITY.md)
- [x] Migração: `search_path` em funções + RLS `(select auth.uid())` + índices FK + policies consolidadas

## IMPORTANTE (concluído)

- [x] Middleware de autenticação Bearer centralizado (`authMiddleware.ts`)
- [x] Helmet no Express
- [x] Logging estruturado ampliado (rotas críticas)
- [x] React Router + URLs no hospital-dashboard
- [x] Bloquear override de URL do backend fora de `import.meta.env.DEV`
- [x] `PatientProvider` + TanStack Query no mobile
- [x] `constants/Colors.ts` alinhado a `src/theme/theme.ts`

## SEGURANÇA BACKEND, IA E EDGE FUNCTIONS (concluído)

- [x] Edge Functions protegidas: secret **`CRON_SECRET`** + header `Authorization: Bearer …` — [`supabase/functions/_shared/cronAuth.ts`](supabase/functions/_shared/cronAuth.ts), [`supabase/functions/README.md`](supabase/functions/README.md)
- [x] Funções afetadas: `medication-reminders`, `treatment-reminders`, `patient-link-notify` (sem vazar corpo de erros de terceiros ao cliente)
- [x] Redução de N+1 nas Edge Functions de lembretes (batch de `*_reminder_dispatches` antes dos loops)
- [x] Sanitização de texto do utilizador antes de enviar a LLM — [`backend/src/sanitizePrompt.ts`](backend/src/sanitizePrompt.ts) (Gemini triagem + OpenAI suporte)
- [x] Webhook de emergência (nadir + febre): assinatura **HMAC-SHA256** em `X-Webhook-Signature`, variável **`HOSPITAL_ALERT_WEBHOOK_SECRET`**, payload **sem** mensagem bruta do paciente — [`backend/src/agentService.ts`](backend/src/agentService.ts)
- [x] Respostas HTTP sem schema Zod detalhado ao cliente; erros Meta/WhatsApp apenas mensagem genérica (detalhe nos logs)
- [x] Idempotência opcional: header **`Idempotency-Key`** no Express — [`backend/src/idempotencyMiddleware.ts`](backend/src/idempotencyMiddleware.ts)
- [x] RLS: DELETE em `patients` restrito a **`hospital_admin`** com vínculo read_write — migração `20260501120000_patients_delete_hospital_admin_only.sql`
- [x] Landing: Error Boundary global — `landing-page-onco/src/components/ErrorBoundary.tsx`
- [x] Variáveis documentadas — [`backend/.env.example`](backend/.env.example)
- [x] Relatório de visão do repositório — [`docs/RELATORIO-PROJETO.md`](docs/RELATORIO-PROJETO.md)

## MELHORIAS (concluído)

- [x] Error Boundary no dashboard (`ErrorBoundary.tsx`)
- [x] `expo-router` exporta ErrorBoundary por rota; shell mobile com `AppErrorBoundary` em `mobile/src/components/AppErrorBoundary.tsx` + `_layout.tsx`
- [x] `App.tsx` fatiado: `lib/dashboardFormat.ts`, `lib/dashboardProfile.ts`, `lib/riskUi.ts`, `components/AuthShell.tsx` (e módulos anteriores: triagem, nav, ícones)
- [x] Tema unificado no mobile (`constants/Colors.ts` → `src/theme/theme.ts`)

---

## TRABALHO RECENTE — concluído (abr–mai 2026)

### Mobile (app)

- [x] OAuth **Google** com fluxo **PKCE** (`supabase.auth.exchangeCodeForSession`), conclusão unificada em `completeOAuthRedirect` — [`mobile/src/auth/oauth.ts`](../mobile/src/auth/oauth.ts)
- [x] Remoção de **Sign in with Apple** (UI + `AuthContext`); pacote e plugin `expo-apple-authentication` removidos — `mobile/app/login.tsx`, `mobile/src/auth/AuthContext.tsx`, `mobile/app.config.js`, `mobile/package.json`
- [x] **`auth/callback`** com o mesmo tratamento de redirect/código que o browser (deep link / cold start) — [`mobile/app/auth/callback.tsx`](../mobile/app/auth/callback.tsx)
- [x] **Home / resumo:** RPC Supabase `rpc_mobile_home_summary` + tipos, parse, skeleton, cartão de ciclo ativo, atalhos por categoria — `fetchHomeSummarySnapshot`, `parseHomeSummaryRpc`, `useHomeSummary`, `HomeSummarySkeleton`, `ActiveTreatmentCycleCard`, `pinnedCategoryShortcuts`
- [x] **Sintomas:** severidade verbal persistida como **TEXT** (migração ENUM→TEXT); diary e filas offline alinhados (`verbalSeverity`, `SymptomQuickLog`, `offlineMutationQueue`)
- [x] **Conta:** eliminar conta autenticada — [`mobile/src/auth/deleteAccount.ts`](../mobile/src/auth/deleteAccount.ts) + `AuthContext.deleteAccount`
- [x] **Observabilidade / rede:** Sentry (`sentry.bootstrap`, `sentry.ts`), `instrumentedFetch`, `NetworkStatusBanner`, `OnlineManagerBridge`, `ScreenLoading`, `appToast`
- [x] **Saúde / UI:** `CategoryMoreSection`, `MedicationCalendarStrip`, validação Zod onboarding — [`mobile/src/validation/onboardingPatient.ts`](../mobile/src/validation/onboardingPatient.ts)
- [x] **Remoção de legado:** módulos de “monitorização de protocolo” (`protocolMonitoring*`, `ProtocolGuidelinesSection`, hooks/types associados)
- [x] **Loja / branding:** assets Play (feature graphic, developer page), `logo-A`, scripts `generate-icons-from-logo.mjs`, `generate-play-feature-graphic.mjs`, `generate-play-developer-page-assets.mjs`
- [x] **Smoke E2E (Maestro):** [`mobile/maestro/smoke.yaml`](../mobile/maestro/smoke.yaml) — base instalada; cenários adicionais em backlog
- [x] **Auditoria QA mobile** — [QA-AUDIT-MOBILE.md](QA-AUDIT-MOBILE.md)

### Supabase / dados

- [x] RPC e índices **`mobile_home_summary`** + ping auxiliar — `20260520140000_rpc_mobile_home_summary.sql`, `20260418140000_mobile_home_summary_rpc_ping.sql`
- [x] Teste SQL RLS do RPC — [`supabase/tests/rpc_mobile_home_summary_rls.sql`](../supabase/tests/rpc_mobile_home_summary_rls.sql)
- [x] Severidade de sintoma **ENUM → TEXT** + CHECK — `20260521120000_severity_enum_to_text.sql`
- [x] Meds arquivo/ordenação — `20260415160000_medications_archive_sort.sql`; ordenação de migração `treatment_kind_infusions` → `20260425120100_*`

### Landing, docs e backend (mesmo período)

- [x] Landing: componentes, favicon, páginas (About, Caregivers, Features, Hospitals, etc.)
- [x] Documentação Play Store Android — [play-store-android-passo-a-passo.md](play-store-android-passo-a-passo.md)
- [x] Backend: ajustes em agente/OCR e biomarcadores; espelho JS em [`shared/lib/biomarkerCanonical.js`](../shared/lib/biomarkerCanonical.js)

### Build Expo (EAS)

- Scripts em [`mobile/package.json`](../mobile/package.json): `eas:build:android` (perfil `production`), `eas:login`, `eas:configure`, `eas:submit:android` — perfis em [`mobile/eas.json`](../mobile/eas.json)

---

## PRD MVP — IMPLEMENTADO

### Épico 1: Onboarding e Perfil Clínico

- [x] **US1.1** Login/cadastro OAuth (**Google**, PKCE) + email/senha — **Apple removido do MVP mobile** — `mobile/app/login.tsx`, `mobile/src/auth/AuthContext.tsx`, `mobile/src/auth/oauth.ts`, `mobile/app/auth/callback.tsx`
- [x] **US1.2** Perfil com tipo de câncer e estadiamento — `patients.cancer_type`, `patients.cancer_stage` (schema inicial)
- [x] **US1.3** Contatos de emergência — `patients.emergency_contact_*` + botão emergência na Home
- [x] Consentimento LGPD granular — `patient_consents` table + `mobile/app/lgpd-consent.tsx`, hook `useConsent.ts`

### Épico 2: Gestão de Medicamentos

- [x] **US2.1** Cadastrar medicamentos (nome, dosagem, frequência) — `medications` table + wizard completo em `mobile/app/(tabs)/health/medications/*`
- [x] **US2.2** Notificações Push — `expo_push_token` em profiles + Edge Function `medication-reminders/index.ts` (**requer `CRON_SECRET` + Bearer nos invokes**)
- [x] **US2.3** Confirmar dose com botão "Tomado" — `medication_logs` table + modal em `medications/index.tsx`
- [x] Wizard visual (cor, forma, horários) — colunas `shape`, `color_*`, `repeat_mode` + `medication_schedules` table
- [x] Medicamentos de uso esporádico (SOS) — `repeat_mode = 'as_needed'`

### Épico 3: Diário de Sintomas (Symptom Tracker)

- [x] **US3.1** Escalas visuais 0–10 (dor, náusea, fadiga) + sliders com haptic — `mobile/app/(tabs)/diary.tsx`
- [x] **US3.2** Registro de humor + nota de voz — campos `mood`, `voice_storage_path` + Storage bucket `patient_voice`
- [x] Gráficos de tendência (dor, febre, frequência) — LineChart/BarChart no diário
- [x] Heatmap de toxicidade (legado) — `ToxicityHeatmap` component
- [x] `requires_action` auto via trigger (sintoma ≥8 PRD ou severe/life_threatening legado)

### Épico 4: Tratamento e Consultas

- [x] **US4.1** Calendário de ciclos de quimio/radio/imuno — `treatment_cycles` + `treatment_kind` enum + telas em `mobile/app/(tabs)/treatment/*`
- [x] **US4.2** Lembretes para consultas/exames — `patient_appointments` table
- [x] Infusões/sessões por ciclo — `treatment_infusions` table com status (scheduled/completed/cancelled) + trigger agregado
- [x] Lembretes push de sessão (dia anterior / mesmo dia) — Edge Function `treatment-reminders/index.ts` (**mesmo requisito `CRON_SECRET`**)
- [x] Edição de ciclos pelo paciente — RLS policies `treatment_cycles_*_patient`

### Épico 5: Relatórios Exportáveis

- [x] **US5.1** PDF exportável (sintomas + medicamentos) via Share Sheet — `mobile/app/reports.tsx` com expo-print/expo-sharing
- [x] Seleção de período (7, 14, 21 dias)

### Calendário Unificado

- [x] Tela `/calendar.tsx` com visualização de eventos (consultas, ciclos, infusões)

### Vinculação Hospital (B2B Prep)

- [x] Fluxo de vínculo paciente–hospital (`patient_hospital_links` e autorizações; ver migrações Sprint vinculação)
- [x] Edge Function `patient-link-notify/index.ts` para notificar pedido pendente (**`CRON_SECRET` + Bearer**)

---

## PENDENTE / EM PROGRESSO

### Operação e configuração (não só código)

- [ ] **Supabase:** definir secret `CRON_SECRET` e configurar **todos** os invokes (cron, GitHub Actions, n8n, `pg_cron`) com `Authorization: Bearer <CRON_SECRET>`
- [ ] **Webhook de alerta:** no destino de `HOSPITAL_ALERT_WEBHOOK_URL`, validar `X-Webhook-Signature` (HMAC-SHA256 do body UTF-8 com `HOSPITAL_ALERT_WEBHOOK_SECRET`); backend já envia assinatura
- [ ] **Produção backend:** garantir `CORS_ORIGINS` e `HOSPITAL_ALERT_WEBHOOK_SECRET` (se usar webhook) antes de `NODE_ENV=production`

### Mobile

- [ ] **Universal Links / App Links** (HTTPS → app) para marketing; redirect **OAuth in-app** já usa scheme (`auraonco://auth/callback` / `makeRedirectUri`) + PKCE no cliente
- [ ] Expandir testes E2E além do smoke Maestro — [`mobile/maestro/smoke.yaml`](../mobile/maestro/smoke.yaml) (Detox opcional)
- [ ] Onboarding walkthrough/tutorial interativo
- [ ] Dark Mode completo (já suportado parcialmente via tema)
- [ ] Accessibility audit (touch targets, VoiceOver, TalkBack)

### Backend / Supabase

- [ ] Testes de integração RLS + RPC **automatizados no CI** contra instância de teste (existe SQL manual: `supabase/tests/rpc_mobile_home_summary_rls.sql`)
- [ ] Cron job / agendamento para **lembretes de consultas** (`patient_appointments`) — além dos lembretes de medicação e infusão já cobertos por Edge Functions
- [ ] Webhook ou fila para equipe médica quando **`requires_action = true`** em sintomas gerais (hoje há fluxo de emergência nadir+febre + webhook assinado para esse caso; generalizar se necessário)
- [ ] Revisão pontual de funções `SECURITY DEFINER` antigas sem `SET search_path = public` (se ainda existirem após migrações)

### Hospital Dashboard

- [ ] Filtrar Realtime por `hospital_id`
- [ ] Dashboard de métricas agregadas (tendências de sintomas por coorte)
- [ ] CSP / headers de segurança adicionais por ambiente
- [ ] **Performance / UX:** `App.tsx` ainda monolítico; falta **code-splitting** (`React.lazy`) e **paginação / cursor** em feeds com `.limit()` fixo (ex.: mensagens, listas longas)

### Qualidade e segurança contínua

- [ ] Testes automatizados SAST/DAST ou pipeline de segurança no CI

### Futuro / Escala

- [ ] Integração HealthKit / Google Fit (wearables)
- [ ] Transcrição automática de notas de voz (Whisper API)
- [ ] Chat interno paciente ↔ navegador oncológico
- [ ] Multi-idioma (i18n completo)
- [ ] Analytics / telemetria (Posthog, Mixpanel)
