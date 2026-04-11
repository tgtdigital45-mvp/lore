# Onco — Um Dia de Cada Vez (MVP)

SaMD / HealthTech stack: **React Native (Expo)**, **Supabase (PostgreSQL + Auth + RLS)**, **Node backend** com **Google Gemini** para triagem de sintomas.

## Estrutura

| Pasta | Descrição |
|--------|------------|
| [`docs/`](docs/) | Visão de produto, BD, compliance, IA, orquestrador, style guide |
| [`supabase/migrations/`](supabase/migrations/) | Schema SQL, RLS, Storage `medical_scans`, seed hospital demo |
| [`backend/`](backend/) | API Express: `/api/agent/process`, limites de taxa, regra de emergência (nadir + febre) |
| [`mobile/`](mobile/) | App Expo Router: Resumo, Diário (gráficos), Assistente (Gemini) |

## Pré-requisitos

- Node 20+
- Conta **Supabase** (URL + anon key) — o app usa Auth e PostgREST, não apenas Postgres genérico
- Chave **Google Gemini** (`GEMINI_API_KEY`) no backend
- Opcional: `HOSPITAL_ALERT_WEBHOOK_URL` para POST de alertas críticos

## 1. Banco de dados (Supabase)

1. Crie um projeto no [Supabase](https://supabase.com).
2. No **SQL Editor**, execute o ficheiro [`supabase/migrations/20260410120000_initial_schema.sql`](supabase/migrations/20260410120000_initial_schema.sql)  
   (ou use a CLI: `supabase db push` se usar Supabase CLI linkado ao projeto.)
3. Confirme que **RLS** está ativo nas tabelas e que o trigger `on_auth_user_created` cria `profiles` ao registar utilizador.

## 2. Backend

```bash
cd backend
cp .env.example .env
# Preencha SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY
npm install
npm run dev
```

Serviço por defeito: `http://localhost:3001` (`GET /api/health`).

## 3. Mobile (Expo)

```bash
cd mobile
cp .env.example .env
# EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_API_URL
npm install
npx expo start
```

- **Android (emulador):** use `http://10.0.2.2:3001` como `EXPO_PUBLIC_API_URL` para alcançar o host.
- **Dispositivo físico:** use o IP da máquina na LAN (ex.: `http://192.168.1.10:3001`).

## Fluxo recomendado de teste

1. Registar utilizador no app → perfil criado pelo trigger.
2. **Cadastro** (modal) → inserir linha em `patients` (hospital demo `00000000-0000-0000-0000-000000000001`).
3. **Diário** → inserir sintomas; gráficos e heatmap usam `symptom_logs`.
4. **Assistente** → texto livre; backend chama Gemini e grava sintomas; com **nadir + febre** dispara mensagem fixa de emergência + notificação local + opcional webhook.

## Segurança

- Não commite `.env` nem chaves. O exemplo em `System Prompt` do utilizador com credenciais deve ser **rotacionado** se foi exposto.
- Produção: usar **Vertex AI** / BAA conforme [`docs/analise-de-modelos-ia.md`](docs/analise-de-modelos-ia.md) e políticas de dados do Supabase.

## Documentação

Consulte [`docs/`](docs/) para regras clínicas (não diagnóstico), matriz RLS e tokens de UI (Apple Health).
