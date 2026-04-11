---
name: Project Audit Report
overview: Auditoria completa do projeto Aura-Onco cobrindo backend, frontend web, mobile, arquitetura de banco de dados, segurança RLS, e fluxos de negócio, com identificação de problemas críticos, médios e melhorias necessárias para produção.
todos:
  - id: security-whatsapp-signature
    content: Adicionar verificacao X-Hub-Signature-256 no webhook WhatsApp
    status: pending
  - id: security-cors-whitelist
    content: Configurar CORS com whitelist de dominios em producao
    status: pending
  - id: security-leaked-password
    content: Habilitar Leaked Password Protection no Supabase
    status: pending
  - id: security-function-search-path
    content: Corrigir search_path nas functions PostgreSQL
    status: pending
  - id: perf-rls-select-auth
    content: Atualizar policies RLS para usar (select auth.uid())
    status: pending
  - id: perf-consolidate-policies
    content: Consolidar policies RLS duplicadas (EN/PT)
    status: pending
  - id: perf-add-fk-indexes
    content: Adicionar indices em foreign keys faltantes
    status: pending
  - id: backend-auth-middleware
    content: Criar middleware de autenticacao centralizado
    status: pending
  - id: backend-helmet
    content: Adicionar Helmet para security headers
    status: pending
  - id: backend-logging
    content: Padronizar logging com logStructured
    status: pending
  - id: dashboard-componentize
    content: Componentizar App.tsx em modulos separados
    status: pending
  - id: dashboard-router
    content: Adicionar React Router ao dashboard
    status: pending
  - id: mobile-patient-provider
    content: Implementar PatientProvider global
    status: pending
  - id: mobile-tanstack-query
    content: Adicionar TanStack Query para cache
    status: pending
  - id: mobile-theme-consolidate
    content: Consolidar sistema de tema (remover Colors.ts)
    status: pending
  - id: tests-integration
    content: Adicionar testes de integracao para auth e RLS
    status: pending
  - id: error-boundaries
    content: Adicionar error boundaries em mobile e dashboard
    status: pending
isProject: false
---

# Auditoria Completa do Projeto Aura-Onco

## Visao Geral

O projeto Aura-Onco e uma plataforma de saude digital (HealthTech) para pacientes oncologicos, com:
- **Backend**: Node/Express API com Supabase, AI (Gemini/OpenAI), Cloudflare R2, WhatsApp Cloud API
- **Mobile**: Expo/React Native com HealthKit, Supabase, tabs navigation
- **Hospital Dashboard**: Vite + React SPA para equipe medica
- **Database**: Supabase PostgreSQL com RLS extensivo

---

## Problemas Criticos (Bloqueadores para Producao)

### 1. Seguranca - Webhook WhatsApp sem Verificacao de Assinatura
**Arquivo**: [backend/src/whatsappRoutes.ts](backend/src/whatsappRoutes.ts)
- O endpoint `POST /api/whatsapp/webhook` nao verifica o header `X-Hub-Signature-256`
- Qualquer atacante pode enviar payloads falsos e manipular status de mensagens
- **Risco**: Falsificacao de status de entrega, possivel manipulacao de dados

### 2. Seguranca - CORS Permissivo Demais
**Arquivo**: [backend/src/index.ts](backend/src/index.ts)
- `cors({ origin: true })` aceita qualquer origem
- Em producao, deve-se restringir a dominios especificos

### 3. Seguranca - Leaked Password Protection Desabilitado
**Fonte**: Supabase Security Advisor
- A protecao contra senhas vazadas (HaveIBeenPwned) esta desabilitada
- Usuarios podem usar senhas comprometidas

### 4. Seguranca - Functions sem search_path Imutavel
**Funcoes afetadas**:
- `public.check_symptom_severity`
- `public.set_symptom_requires_action`
- `public.touch_health_wearable_samples_updated_at`
- Vulneravel a ataques de search_path injection

### 5. Performance - RLS Policies Re-avaliando auth.uid() por Linha
**Tabelas afetadas**: profiles, patients, symptom_logs, biomarker_logs, medical_documents, treatment_cycles, audit_logs, health_wearable_samples, staff_assignments, hospitals, outbound_messages
- 40+ policies usando `auth.uid()` diretamente em vez de `(select auth.uid())`
- Causa re-execucao da funcao para cada linha, degradando performance exponencialmente

### 6. Performance - Politicas RLS Duplicadas
**Problema**: Multiplas policies permissivas para mesma tabela/acao/role
- `profiles`: 3 SELECT policies, 2 UPDATE policies duplicadas (EN/PT)
- `patients`: 3 SELECT policies, 2 INSERT policies
- `symptom_logs`: 3 SELECT policies, 2 INSERT policies
- **Causa**: Todas as policies sao avaliadas, multiplicando overhead

### 7. Arquitetura - App.tsx Monolitico (3.200 linhas)
**Arquivo**: [hospital-dashboard/src/App.tsx](hospital-dashboard/src/App.tsx)
- Todo o dashboard em um unico arquivo
- Impossivel de testar, manter ou revisar
- Sem separacao de concerns, sem roteamento, sem componentizacao

### 8. Demo Self-Assignment sem Restricao Adequada
**Arquivo**: [hospital-dashboard/src/staffLink.ts](hospital-dashboard/src/staffLink.ts)
- Qualquer usuario pode se atribuir role `hospital_admin` ao demo hospital
- Em producao, deve ser controlado server-side apenas

---

## Problemas Medios

### 9. Performance - Indices Faltando em Foreign Keys
**Tabelas afetadas**:
- `audit_logs.actor_id`
- `medical_documents.patient_id`
- `outbound_messages.actor_id`, `outbound_messages.hospital_id`
- `staff_assignments.hospital_id`
- `symptom_logs.cycle_id`
- `treatment_cycles.patient_id`

### 10. Codigo Duplicado - Validacao Bearer Token
**Arquivos**: index.ts, examHandlers.ts, whatsappRoutes.ts
- Logica de autenticacao Bearer repetida em cada handler
- Deveria ser middleware centralizado

### 11. Mobile - Sem Cache de Dados Global
**Arquivo**: [mobile/src/hooks/usePatient.ts](mobile/src/hooks/usePatient.ts)
- Cada tela que usa `usePatient()` faz query independente
- Nao ha TanStack Query ou cache compartilhado
- Navegacao entre tabs repete fetches desnecessarios

### 12. Mobile - Telas Muito Grandes
**Arquivos**:
- `mobile/app/(tabs)/index.tsx` (~590 linhas)
- `mobile/app/(tabs)/exams/index.tsx` (muito grande)
- Dificil de testar e manter

### 13. Mobile - Dois Sistemas de Tema
- `src/theme/theme.ts` vs `constants/Colors.ts` + `components/Themed.tsx`
- Risco de inconsistencia visual

### 14. Backend - Logging Inconsistente
- Mix de `console.error()` e `logStructured()`
- Dificulta debugging em producao

### 15. Backend - Rate Limiter sem trust proxy
- Sem `app.set('trust proxy', 1)` atras de load balancer
- IP-based rate limiting pode nao funcionar corretamente

### 16. Dashboard - URL Backend Configuravel em SessionStorage
**Arquivo**: [hospital-dashboard/src/App.tsx](hospital-dashboard/src/App.tsx)
- Usuario pode alterar `aura_hospital_backend_url` e enviar JWT para servidor malicioso
- Em producao, deve ser fixo

### 17. Dashboard - Sem Roteamento
- Navegacao por estado `navActive`, sem URLs
- Nao ha deep links, back/forward do browser nao funciona

---

## Melhorias Recomendadas

### 18. Consolidar Policies RLS
- Remover policies duplicadas (PT/EN)
- Unificar em policies unicas usando `OR` conditions

### 19. Criar Middleware de Auth no Backend
- Extrair logica Bearer em `authMiddleware.ts`
- Reutilizar em todas as rotas protegidas

### 20. Implementar State Management no Mobile
- Adicionar TanStack Query para cache de dados
- Criar PatientProvider para estado global do paciente

### 21. Componentizar Hospital Dashboard
- Extrair screens em componentes separados
- Adicionar React Router para navegacao

### 22. Adicionar Testes Automatizados
**Situacao atual**:
- Backend: apenas `nadirFeverRules.test.ts`
- Mobile: apenas `StyledText-test.js`
- Dashboard: nenhum teste
- **Necessario**: testes de integracao para auth, OCR, RLS

### 23. Adicionar Error Boundaries
- Mobile e Dashboard sem error boundaries
- Crash em qualquer componente derruba app inteiro

### 24. Implementar Helmet no Backend
- Headers de seguranca faltando (CSP, HSTS, etc)

### 25. Documentar Enum Types
- `document_type` no banco: `blood_test`, `biopsy`, `scan`, `administrative`
- Mas docs mostram apenas 3 tipos - manter sincronizado

---

## Problemas de Logica de Negocio

### 26. Onboarding Nao-Bloqueante
**Arquivo**: [mobile/app/index.tsx](mobile/app/index.tsx)
- Usuario autenticado sem `patients` row ainda acessa tabs
- Home mostra "complete onboarding" mas nao bloqueia acesso

### 27. Realtime Escutando Todos os symptom_logs
**Arquivo**: [hospital-dashboard/src/App.tsx](hospital-dashboard/src/App.tsx)
- Subscription em `postgres_changes` sem filtro de `hospital_id`
- Recebe eventos de todos os hospitais (RLS filtra ao refetch)
- Potencial leak de informacao sobre existencia de dados

### 28. Share Link de 7 Dias
**Arquivo**: [backend/src/examHandlers.ts](backend/src/examHandlers.ts)
- Presigned URL de share valida por 7 dias
- Considerar token de acesso temporario em vez de URL longa

---

## Plano de Implementacao (Ordem de Prioridade)

### Fase 1 - Seguranca Critica (Bloqueadores)
1. Adicionar verificacao X-Hub-Signature-256 no webhook WhatsApp
2. Configurar CORS com whitelist de dominios
3. Habilitar Leaked Password Protection no Supabase
4. Corrigir search_path nas functions

### Fase 2 - Performance RLS
5. Atualizar todas policies RLS para usar `(select auth.uid())`
6. Consolidar policies duplicadas
7. Adicionar indices faltantes em foreign keys

### Fase 3 - Refatoracao Backend
8. Criar middleware de autenticacao centralizado
9. Adicionar Helmet para security headers
10. Padronizar logging com logStructured

### Fase 4 - Refatoracao Dashboard
11. Componentizar App.tsx em modulos
12. Adicionar React Router
13. Remover override de backend URL

### Fase 5 - Mobile
14. Implementar PatientProvider
15. Adicionar TanStack Query
16. Consolidar sistema de tema

### Fase 6 - Qualidade
17. Adicionar testes de integracao
18. Documentar APIs e enums
19. Adicionar error boundaries

---

## Arquivos Chave para Referencia

- Backend entry: [backend/src/index.ts](backend/src/index.ts)
- Auth mobile: [mobile/src/auth/AuthContext.tsx](mobile/src/auth/AuthContext.tsx)
- Supabase client mobile: [mobile/src/lib/supabase.ts](mobile/src/lib/supabase.ts)
- Dashboard monolito: [hospital-dashboard/src/App.tsx](hospital-dashboard/src/App.tsx)
- Migrations: [supabase/migrations/](supabase/migrations/)
