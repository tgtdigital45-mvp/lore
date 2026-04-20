# OncoCare — Dashboard hospitalar (Vite + React)

**Sumário executivo:** o **dashboard hospitalar** é a aplicação web utilizada por **equipas clínicas e administrativas** para triagem, prontuário longitudinal do paciente, agenda de recursos, mensagens (incl. integração WhatsApp via backend), operações de infusão e definições do hospital. Consome **Supabase** (Auth, Postgres, **Realtime**) com políticas RLS adequadas ao contexto staff, e o **backend Express** para OCR, ficheiros, envio de mensagens e relatórios que exigem segredos de servidor.

---

## 1. Valor de negócio (o que entregamos)

| Capacidade | Descrição |
|------------|-----------|
| **Triagem e dossiê** | Área `paciente/` com lista contextual e **dossiê por paciente** (abas: resumo, linha do tempo, métricas, ficha, tratamento, toxicidade, resposta tumoral, QoL, risco, tarefas, exames, medicamentos, diário, nutrição, atividades, agendamentos, mensagens). |
| **Operação** | Agenda de recursos, página de **operação de infusão**, workspace de **mensagens**. |
| **Governança** | Configurações do hospital, conta staff, export FHIR onde aplicável, histórico de vínculos e pedidos pendentes. |
| **Experiência** | Layout responsivo, componentes de skeleton, integração com **painel por defeito** após login (memória de última visita). |

---

## 2. Stack técnica

| Camada | Tecnologia |
|--------|------------|
| Build | **Vite 6**, **React 19**, **React Router 7** |
| Linguagem | **TypeScript** |
| Dados | **@supabase/supabase-js** (sessão staff, queries, **Realtime**) |
| Estilo | **Tailwind CSS** (ver `tailwind.config.js`) |
| Modelo | **SPA** — shell de rotas em `src/App.tsx` |

---

## 3. Rotas principais (`src/App.tsx`)

| Rota | Módulo |
|------|--------|
| `/` | Redireciona para o painel por defeito (ex.: triagem ou lista de pacientes). |
| `/paciente` | Workspace de triagem (placeholder ou lista). |
| `/paciente/:patientId` | **Dossiê do paciente** (lazy `PatientDossierRoute`). |
| `/pacientes` | Lista e gestão de pacientes. |
| `/agenda` | Agenda; `/agenda/recurso/:resourceId` detalhe de recurso. |
| `/mensagens` | Workspace de mensagens. |
| `/configuracoes` | Definições do hospital. |
| `/operacao-infusao` | Dashboard operacional de infusão. |
| `/conta` | Definições da conta staff. |

### Fluxo canónico staff: triagem → dossiê

1. **`TriageWorkspaceLayout`** (`/paciente`): coluna central com a fila (`TriagePatientCard`); à direita, `<Outlet />` para o detalhe.
2. **Abrir dossiê:** clique no cartão ou no link do paciente navega para **`/paciente/:patientId`** (ver `TriagePatientCard.tsx`).
3. **`PatientDossierRoute`:** só monta `PatientDossierPage` se o `patientId` existir na fila atual (`useOncoCare().rows`); caso contrário redireciona para `/paciente`.
4. **Conteúdo clínico:** o dossiê completo (abas, gráficos, exames, diário, etc.) vive em **`PatientDossierPage`** — não há modal legado de prontuário; **`AddPatientModal`** em `/pacientes` é só para inclusão de paciente.

---

## 4. Variáveis de ambiente

Criar `hospital-dashboard/.env`:

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | Sim | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Sim | Chave **anon** (pública) do Supabase |
| `VITE_BACKEND_URL` | Recomendado em produção | URL do backend **sem** barra final (OCR, WhatsApp, relatórios, exames) |

**Desenvolvimento:** com `npm run dev`, o Vite pode reencaminhar `/api/*` para `http://127.0.0.1:3001` — ver `vite.config.ts`. Em **produção**, defina sempre `VITE_BACKEND_URL` em HTTPS e alinhe **`CORS_ORIGINS`** no backend.

---

## 5. Comandos

```bash
cd hospital-dashboard
npm install
npm run dev
```

```bash
npm run build
npm run preview
npm run lint
```

---

## 6. Integrações com o monorepo

| Sistema | README |
|---------|--------|
| Backend API | [`../backend/README.md`](../backend/README.md) |
| Supabase (migrações, funções) | [`../supabase/README.md`](../supabase/README.md), [`../supabase/functions/README.md`](../supabase/functions/README.md) |
| App paciente | [`../mobile/README.md`](../mobile/README.md) |
| Visão global | [`../README.md`](../README.md) |

Contratos e sprints históricos: [`../docs/data-contract-dashboard.md`](../docs/data-contract-dashboard.md), [`../docs/hospital-dashboard-sprint.md`](../docs/hospital-dashboard-sprint.md).

---

## 7. Notas de compliance e operações

- **Não** commitar `.env` com chaves reais.
- Deploy (ex.: Vercel): configurar `VITE_*` no painel; validar cookies/sessão e domínios permitidos no Supabase Auth.
- A superfície de dados depende das **políticas RLS** — qualquer alteração de schema deve ser acompanhada de testes de autorização.

---

*Documentação de pasta: onboarding de engenharia frontend, handover para equipa de produto e suporte a auditorias técnicas.*
