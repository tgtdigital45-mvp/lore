# Operação — Supabase, cron e webhooks

Checklist para ambientes de **staging** e **produção**. Complementa [SECURITY.md](SECURITY.md).

## CRON_SECRET e invokes das Edge Functions

1. No **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**, defina:
   - `CRON_SECRET` — segredo forte (≥16 caracteres), aleatório.
2. **Todas** as invocações agendadas (cron, GitHub Actions, n8n, `pg_cron`, etc.) devem enviar:
   - `Authorization: Bearer <CRON_SECRET>`
   - ou o header que cada função documenta (ver [supabase/functions/README.md](../supabase/functions/README.md)).
3. Funções afetadas incluem: `medication-reminders`, `treatment-reminders`, `patient-link-notify`, `appointment-reminders`, `requires-action-webhook` (quando existirem no projeto).

Sem o segredo correto, as funções respondem **401**.

## Webhook de alerta hospitalar (destino)

O backend (`onco-backend`) envia alertas com corpo JSON e assinatura:

- Cabeçalho: `X-Webhook-Signature` = **hex** do HMAC-SHA256 do corpo UTF-8 com o segredo `HOSPITAL_ALERT_WEBHOOK_SECRET`.

No **servidor que recebe** o webhook (n8n, Cloudflare Worker, etc.):

1. Leia o corpo bruto (string UTF-8).
2. Calcule `HMAC-SHA256(body, secret)` em hex.
3. Compare em tempo constante com `X-Webhook-Signature`.
4. Rejeite se não coincidir ou se faltar o cabeçalho.

Variáveis no backend: `HOSPITAL_ALERT_WEBHOOK_URL`, `HOSPITAL_ALERT_WEBHOOK_SECRET` (ver [backend/.env.example](../backend/.env.example)).

As Edge Functions que reutilizam o mesmo destino devem ter as mesmas secrets configuradas no Supabase.

## API Node — CORS e produção

- Em `NODE_ENV=production`, o backend **termina ao iniciar** se `CORS_ORIGINS` estiver vazio ou ausente.
- Defina `CORS_ORIGINS` com uma lista separada por vírgulas das origens permitidas (ex.: `https://dashboard.exemplo.com,https://landing.exemplo.com`).

## OAuth mobile (redirect)

No **Supabase Dashboard** → **Authentication** → **URL Configuration**, inclua o redirect nativo:

- `auraonco://auth/callback`

(Scheme definido em `mobile/app.json` → `expo.scheme`.) A rota `app/auth/callback.tsx` conclui a sessão quando a app abre pelo deep link.

## Verificação rápida pós-deploy

- [ ] `CRON_SECRET` definido e cron/teste manual com `Authorization: Bearer` retorna 200 nas funções de lembrete.
- [ ] Webhook de alerta valida `X-Webhook-Signature` no destino.
- [ ] Backend em produção com `CORS_ORIGINS` preenchido e `HOSPITAL_ALERT_WEBHOOK_SECRET` se usar webhook.
