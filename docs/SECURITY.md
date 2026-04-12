# Segurança — configuração manual (Supabase / produção)

## Leaked password protection (Have I Been Pwned)

O Supabase Auth pode rejeitar senhas que apareceram em vazamentos públicos.

1. Supabase Dashboard → **Authentication** → **Providers** → **Email**
2. Ative **Leaked password protection** (ou equivalente na sua versão do dashboard)

Documentação: [Password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

## Webhook WhatsApp (Meta)

- Defina `WHATSAPP_APP_SECRET` no `onco-backend` (mesmo segredo da app Meta).
- O `POST /api/whatsapp/webhook` exige cabeçalho `X-Hub-Signature-256` válido; sem segredo o endpoint responde `503`.

## CORS (API Node)

- Em produção, defina `CORS_ORIGINS` com lista separada por vírgulas (ex.: `https://dashboard.exemplo.com,http://localhost:5173`).
- **Sem lista em `NODE_ENV=production`, o processo termina ao iniciar** (falha explícita). Em desenvolvimento, sem `CORS_ORIGINS` o CORS permanece permissivo para facilitar testes locais.

Ver também [OPERATIONS.md](OPERATIONS.md) (cron, webhooks, checklist).
