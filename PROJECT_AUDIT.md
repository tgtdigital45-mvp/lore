# Auditoria completa do projeto Aura-Onco

## O que já está bem feito

- **RLS** em todas as tabelas `public` relevantes, com padrão hospital + paciente.
- **Backend** com validação Zod, rate limit em rotas sensíveis, OCR e exames com checagens de posse / staff.
- **Mobile** com tokens no SecureStore, tema central em `src/theme/theme.ts`, Expo Router.
- **Dashboard** com UI consistente e fluxos de triagem/auditoria.
- **Migrações** versionadas em `supabase/migrations/`.

## Problemas encontrados

### Críticos (mitigados ou documentados nesta entrega)

- Webhook WhatsApp sem assinatura → **corrigido**: verificação `X-Hub-Signature-256` + corpo bruto.
- CORS aberto → **mitigado**: whitelist opcional via `CORS_ORIGINS`; aviso em produção sem lista.
- Policies RLS com `auth.uid()` por linha e duplicatas EN/PT → **migração** `20260422120000_rls_perf_search_path_indexes.sql`.
- Funções com `search_path` mutável → **ALTER** na migração acima (quando existirem).
- Leaked password no Supabase → **documentado** em [docs/SECURITY.md](docs/SECURITY.md) (ação no dashboard).

### Médios

- Dashboard ainda monolítico em `App.tsx` (navegação extraída para URL com React Router).
- Testes de integração E2E ainda limitados.

### Melhorias

- Quebra do `App.tsx` em mais componentes/páginas.
- Mais testes (API + RLS com projeto de teste).

## Problemas de lógica

- Onboarding ainda não bloqueia tabs por rota (comportamento de produto a definir).
- Realtime no dashboard pode ser filtrado por `hospital_id` no futuro.

## Problemas de arquitetura

- Três apps sem monorepo na raiz; envs dispersos — manter `.env.example` alinhados.

## Plano de implementação (ordem)

1. Aplicar migrações Supabase em staging/produção.
2. Configurar `WHATSAPP_APP_SECRET`, `CORS_ORIGINS`, leaked password no Supabase.
3. Monitorar advisors Supabase (security + performance) após deploy.
