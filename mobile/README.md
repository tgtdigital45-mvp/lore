# Onco — App mobile (Expo)

Aplicação para **pacientes**: diário de sintomas, medicamentos, tratamento, exames/OCR, calendário, relatórios PDF, vinculação com hospital e consentimentos LGPD.

## Stack

- **Expo SDK ~54**, **expo-router** (file-based routes)
- **React** + **TypeScript**
- **Supabase** (Auth, Postgres via cliente, Storage)
- **TanStack Query** em parte dos fluxos
- **expo-notifications**, **expo-print**, **expo-sharing**, etc.

## Pré-requisitos

- Node 20+
- Conta **Supabase** (mesmo projeto que o backend e o dashboard)
- Para OCR, agente e exames: **onco-backend** a correr (instruções em [`../README.md`](../README.md) secção Backend; variáveis em [`../backend/.env.example`](../backend/.env.example))

## Variáveis de ambiente

Crie `mobile/.env` (ou use a raiz do repo / `backend/.env` — ver [`app.config.js`](app.config.js)).

| Variável | Descrição |
|----------|-----------|
| `EXPO_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Chave **anon** (pública) do Supabase |
| `EXPO_PUBLIC_API_URL` | URL base do **onco-backend** (ex.: `http://localhost:3001` — alinhar com `PORT` do backend; em Android emulador frequentemente `http://10.0.2.2:3001`; em dispositivo físico, IP da máquina na LAN) |

Alternativas aceites pelo `app.config.js`: `SUPABASE_URL` / `SUPABASE_ANON_KEY` (úteis se partilhares o `.env` do backend).

## Comandos

```bash
cd mobile
npm install
npm run start
# ou
npm run android
npm run ios
npm run web
```

Limpar cache do Metro: `npm run start:clear`

Typecheck: `npm run typecheck`

## Estrutura (resumo)

| Pasta / ficheiro | Conteúdo |
|------------------|----------|
| `app/` | Rotas Expo Router (tabs, tratamento, saúde, exames, etc.) |
| `src/auth/` | AuthContext, OAuth (Google, Apple) |
| `src/hooks/` | Dados Supabase, consentimentos, ciclos, etc. |
| `src/lib/supabase.ts` | Cliente Supabase (SecureStore / web) |

## Documentação do monorepo

- Visão geral: [`../README.md`](../README.md)
- PRD / backlog: [`../TODO_MASTER.md`](../TODO_MASTER.md)
- Relatório do projeto: [`../docs/RELATORIO-PROJETO.md`](../docs/RELATORIO-PROJETO.md)
- Segurança: [`../docs/SECURITY.md`](../docs/SECURITY.md)

## Notas

- Não commite ficheiros `.env` com chaves reais.
- O backend usa **JWT** do Supabase; o app envia o token nas chamadas à API Express quando aplicável.
