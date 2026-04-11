# Edge Functions

Defina no projeto Supabase (Secrets):

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — já habituais
- **`CRON_SECRET`** — segredo forte (≥16 caracteres). Todas as funções em `medication-reminders`, `treatment-reminders` e `patient-link-notify` exigem:

  `Authorization: Bearer <CRON_SECRET>`

Invoque com `POST` (ou `GET` nas funções de cron) e esse header. Sem o segredo correto, a resposta é `401`.
