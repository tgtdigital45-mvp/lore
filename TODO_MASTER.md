# TODO MASTER - PROJETO

## CRÍTICO

- [x] Verificação `X-Hub-Signature-256` no webhook WhatsApp
- [x] CORS configurável (`CORS_ORIGINS`) + aviso em produção
- [x] Documentar / ativar leaked password protection (Supabase Dashboard) — ver [docs/SECURITY.md](docs/SECURITY.md)
- [x] Migração: `search_path` em funções + RLS `(select auth.uid())` + índices FK + policies consolidadas

## IMPORTANTE

- [x] Middleware de autenticação Bearer centralizado (`authMiddleware.ts`)
- [x] Helmet no Express
- [x] Logging estruturado ampliado (rotas críticas)
- [x] React Router + URLs no hospital-dashboard
- [x] Bloquear override de URL do backend fora de `import.meta.env.DEV`
- [x] `PatientProvider` + TanStack Query no mobile
- [x] `constants/Colors.ts` alinhado a `src/theme/theme.ts`

## MELHORIAS

- [x] Error Boundary no dashboard (`ErrorBoundary.tsx`)
- [x] `expo-router` já exporta ErrorBoundary; mobile usa tema unificado em Colors
- [ ] Dividir `hospital-dashboard/src/App.tsx` em módulos menores
- [ ] Error boundary explícita em shell mobile (opcional; Expo já fornece)

## FUTURO / ESCALA

- [ ] Testes de integração contra Supabase de teste (RLS + RPC)
- [ ] Filtrar Realtime por hospital
- [ ] CSP / headers adicionais por ambiente
