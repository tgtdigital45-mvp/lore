# Edge Functions

Defina no projeto Supabase (Secrets):

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — já habituais
- **`CRON_SECRET`** — segredo forte (≥16 caracteres). As funções abaixo exigem:

  `Authorization: Bearer <CRON_SECRET>`

- Funções: `medication-reminders`, `treatment-reminders`, `patient-link-notify`, `appointment-reminders`, `requires-action-webhook`.

Invoque com `POST` (ou `GET` nas funções de cron) e esse header. Sem o segredo correto, a resposta é `401`.

### `requires-action-webhook`

- Envia alertas para o mesmo destino configurável do backend: defina no projeto Supabase **`HOSPITAL_ALERT_WEBHOOK_URL`** e **`HOSPITAL_ALERT_WEBHOOK_SECRET`** (HMAC-SHA256 hex no header `X-Webhook-Signature`, mesmo contrato que o `onco-backend`).
- Processa entradas em `symptom_logs` com `requires_action = true` ainda não registadas em `requires_action_webhook_dispatches`. Agende o invoke (ex.: a cada 1–5 min) com o mesmo `Authorization: Bearer`.
