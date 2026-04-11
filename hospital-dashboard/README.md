# Onco — Dashboard hospitalar (Vite + React)

Interface **web para equipas clínicas e gestão**: triagem de pacientes, sintomas, exames, mensagens (ex.: WhatsApp via backend), auditoria e definições do hospital. Consome o **mesmo projeto Supabase** que o app mobile e o **onco-backend** para OCR, envio WhatsApp e ficheiros de exames.

## Stack

- **Vite 6**, **React 19**, **React Router 7**
- **TypeScript**
- **@supabase/supabase-js** (sessão staff + queries + Realtime)
- Sem Next.js — SPA cliente única (`src/App.tsx` como shell principal)

## Pré-requisitos

- Node 20+
- Projeto **Supabase** com migrações aplicadas (ver [`../supabase/migrations/`](../supabase/migrations/))
- **onco-backend** para fluxos que exigem API dedicada (OCR, WhatsApp, download/view de exames)

## Variáveis de ambiente

Crie `hospital-dashboard/.env`:

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | Sim | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Sim | Chave **anon** do Supabase |
| `VITE_BACKEND_URL` | Recomendado | URL do onco-backend **sem** barra final (ex.: `http://localhost:3001`). Usado para OCR, WhatsApp e exames; também pode ser indicado na UI (Integração) |

Em produção, o backend deve listar a origem do dashboard em **`CORS_ORIGINS`**.

## Comandos

```bash
cd hospital-dashboard
npm install
npm run dev
```

Build e pré-visualização:

```bash
npm run build
npm run preview
```

Lint: `npm run lint`

## Funcionalidades (alto nível)

- Login com Supabase Auth (perfil staff / `staff_assignments`)
- Lista e detalhe de pacientes com regras de risco / alertas
- Realtime em atualizações relevantes (ex.: sintomas)
- Integração com backend para upload OCR de exames e mensagens outbound

## Documentação do monorepo

- Raiz: [`../README.md`](../README.md)
- Contrato / sprint dashboard: [`../docs/data-contract-dashboard.md`](../docs/data-contract-dashboard.md), [`../docs/hospital-dashboard-sprint.md`](../docs/hospital-dashboard-sprint.md)
- Backlog: [`../TODO_MASTER.md`](../TODO_MASTER.md)
- Relatório: [`../docs/RELATORIO-PROJETO.md`](../docs/RELATORIO-PROJETO.md)

## Notas

- Não commite `.env` com chaves reais.
- Deploy (ex.: Vercel): configurar as variáveis `VITE_*` no painel e apontar `VITE_BACKEND_URL` para o backend público em HTTPS.
