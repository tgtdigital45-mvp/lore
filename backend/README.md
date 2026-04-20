# OncoCare — Backend API (Express + Node)

**Sumário para stakeholders técnicos:** este serviço é a **camada de orquestração segura** entre clientes (app mobile, dashboard hospitalar), o **PostgreSQL/Auth do Supabase**, fornecedores de **IA** (Gemini, OpenAI), armazenamento **R2**, e canais de **mensagens** (Meta WhatsApp Cloud API e/ou **Evolution API**). Expõe rotas REST com validação, rate limiting e JWT do Supabase nas rotas autenticadas.

---

## 1. Responsabilidades (o que este backend faz)

| Domínio | Descrição |
|--------|-----------|
| **OCR e exames** | Processamento de imagens/PDF com Gemini (e fallback OpenAI); metadados e ficheiros podem ir para R2. |
| **Assistente / suporte** | Chat de suporte e fluxos que exigem chaves de servidor. |
| **WhatsApp e mensagens** | Envio outbound (`/api/whatsapp/send`); webhook Meta (`/api/whatsapp/webhook`); **webhook Evolution** (`/api/evolution/webhook`) para mensagens inbound com persistência via Supabase. |
| **Alertas hospitalares** | Webhook opcional assinado (HMAC) para eventos que exigem ação humana. |
| **Configuração** | `MESSAGING_PROVIDER` escolhe entre `meta` e `evolution` quando ambos estão configurados. |

---

## 2. Arranque rápido

```bash
cd backend
cp .env.example .env
# Preencher SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY, etc.
npm install
npm run dev
```

- **Saúde:** `GET http://localhost:3001/api/health` (porta padrão `3001`, configurável com `PORT`).
- **Produção:** com `NODE_ENV=production`, **`CORS_ORIGINS`** é obrigatório (lista de origens do dashboard e outras SPAs).

Documentação completa das variáveis: **[`.env.example`](.env.example)** (único ficheiro de referência de secrets **sem** valores reais — nunca commitar `.env`).

---

## 3. Integrações críticas

### 3.1 Supabase

- **`SUPABASE_URL` / `SUPABASE_ANON_KEY`:** validação de JWT e operações com contexto de utilizador.
- **`SUPABASE_SERVICE_ROLE_KEY`:** apenas onde o produto exige bypass de RLS (ex.: ingestão de webhooks Evolution); tratar como segredo máximo.

### 3.2 Evolution API (WhatsApp)

- **`EVOLUTION_API_BASE_URL`**, **`EVOLUTION_API_KEY`**, **`EVOLUTION_INSTANCE_NAME`**: envio de texto pela API Evolution v2.
- **`EVOLUTION_WEBHOOK_SECRET`**: query `secret=` na URL do webhook; o backend valida antes de processar eventos.

### 3.3 Meta WhatsApp Cloud

- **`WHATSAPP_*`**: token, phone number id, verify token, opcional `WHATSAPP_APP_SECRET` para `X-Hub-Signature-256`.

---

## 4. Testes e qualidade

- Testes unitários onde existirem (ex.: `evolutionWebhook.test.ts` para parsing/validação do webhook).
- Recomendação: CI com `npm test` / `npm run lint` conforme `package.json`.

---

## 5. Documentação relacionada

| Recurso | Localização |
|---------|-------------|
| Monorepo (visão C4, arranque) | [`../README.md`](../README.md) |
| Migrações e RLS | [`../supabase/README.md`](../supabase/README.md) |
| Edge Functions (cron, relatórios) | [`../supabase/functions/README.md`](../supabase/functions/README.md) |
| Dashboard (consumo desta API) | [`../hospital-dashboard/README.md`](../hospital-dashboard/README.md) |

---

*README orientado a onboarding de engenharia, auditoria de segurança e handover entre equipas.*
