# Edge Functions (Supabase / Deno)

**Sumário para a empresa:** as Edge Functions são **micro-serviços HTTP** executados na infraestrutura Supabase, com acesso privilegiado ao Postgres via **service role** quando necessário. São usadas para **lembretes**, **notificações**, **webhooks de alerta** e **relatórios** que não devem expor segredos no browser ou no app móvel.

---

## 1. Segredos obrigatórios (projeto Supabase)

Defina nos **Secrets** do projeto:

| Variável | Uso |
|----------|-----|
| `SUPABASE_URL` | URL do projeto |
| `SUPABASE_SERVICE_ROLE_KEY` | Cliente com privilégios (apenas servidor) |
| `SUPABASE_ANON_KEY` | Onde a função valida JWT do utilizador com cliente anon + header `Authorization` |
| **`CRON_SECRET`** | Segredo forte (≥16 caracteres). Várias funções exigem `Authorization: Bearer <CRON_SECRET>` em invocações agendadas |

**Regra de segurança:** sem o `Bearer` correto (`CRON_SECRET` ou JWT válido conforme a função), a resposta deve ser **`401`**.

---

## 2. Funções existentes (cron / internas)

Funções referenciadas no fluxo operacional (exemplos típicos):

- `medication-reminders`, `treatment-reminders`, `patient-link-notify`, `appointment-reminders`
- Invocar com **`POST`** (ou `GET` onde aplicável) e header `Authorization: Bearer <CRON_SECRET>`

### `requires-action-webhook`

- Envia alertas para o destino configurável alinhado ao backend: **`HOSPITAL_ALERT_WEBHOOK_URL`** + **`HOSPITAL_ALERT_WEBHOOK_SECRET`** (HMAC-SHA256 hex no header `X-Webhook-Signature`, mesmo contrato que o `oncocare-backend`).
- Processa entradas em `symptom_logs` com `requires_action = true` ainda não registadas em `requires_action_webhook_dispatches`.
- Agendar invoke periódico (ex.: 1–5 min) com o mesmo `Authorization: Bearer`.

---

## 3. Novas funções (produto / clínica)

### `generate-evolution-report`

- **Objetivo:** gerar **relatório HTML de evolução clínica** (agregação de dados + opcional enriquecimento LLM).
- **Auth:** JWT do staff (invoke a partir do dashboard com `Authorization: Bearer <access_token>`).
- **Body (JSON):** `{ "patient_id": "<uuid>", "horizon_days"?: number }`
- **CORS:** configurado para permitir chamadas com `authorization` e `apikey` (ajustar origem em produção se necessário).

### `pro-questionnaire-dispatch`

- **Objetivo:** disparar lembrete de **questionário PRO (QoL)**; integração com canal de mensagens conforme configuração do projeto.
- **Auth:** `CRON_SECRET` (**Bearer**) para jobs agendados **ou** JWT de staff com papel `hospital_admin` / `doctor`.
- **Body (JSON):** `{ "patient_id": string, "questionnaire_type"?: string, "phone_e164"?: string }`

### `risk-projection-stub`

- **Objetivo:** endpoint de **stub / projeção de risco** para desenvolvimento ou fallback — manter contrato estável enquanto o modelo analítico evolui.

---

## 4. Documentação relacionada

| Recurso | Localização |
|---------|-------------|
| Migrações e RLS | [`../README.md`](../README.md) na pasta `supabase/` |
| Backend (webhooks WhatsApp/Evolution) | [`../../backend/README.md`](../../backend/README.md) |
| Segurança global | [`../../docs/SECURITY.md`](../../docs/SECURITY.md) |

---

*README mantido para operações, onboarding de plataforma e revisão de superfície de ataque (secrets + auth por função).*
