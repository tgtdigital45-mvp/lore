# Sprints — Migração `hospital-dashboard` (Vite → Next.js 15 App Router)

## Sprint 0 — Tooling e Supabase

- [x] `package.json`: `next`, scripts, `@supabase/ssr`; remover Vite / `react-router-dom`
- [x] `next.config.mjs`: rewrites `/api/*` → backend; `/functions/v1/*` → Supabase (se `NEXT_PUBLIC_SUPABASE_URL`)
- [x] `tsconfig` alinhado ao Next; `src/lib/supabase/client.ts` + middleware/callback
- [x] `outputFileTracingRoot` se houver `package-lock` no monorepo

## Sprint 1 — App Router, shell e auth

- [x] `src/app/layout.tsx` (CSS global, `Providers`)
- [x] `src/app/(shell)/layout.tsx` + `page.tsx` e rotas espelhando o router antigo
- [x] `src/middleware.ts` + rotas públicas `/`, `/auth/*`, `/tv/*`
- [x] `src/app/auth/callback/route.ts` (PKCE)
- [x] `export const dynamic = "force-dynamic"` no root (evita SSG sem env Supabase no build)

## Sprint 2 — Views (ex-`pages/`) e componentes

- [x] Renomear `src/pages` → **`src/views`** (evitar conflito com Pages Router do Next)
- [x] `"use client"` onde necessário; `Suspense` + `useSearchParams` no dossiê
- [x] `not-found` → `DefaultPanelRedirect`

## Sprint 3 — Rotas e links

- [x] Trocar `react-router` por `next/navigation` + `next/link` (já feito em fases anteriores)
- [x] Garantir zero `react-router` em `src` (só ficheiros removidos)

## Sprint 4 — Variáveis de ambiente e estilos

- [x] `VITE_*` / `import.meta` → `NEXT_PUBLIC_*` / `process.env.NODE_ENV`
- [x] `tailwind.config.js` `content` inclui `src/app/**`
- [x] `postcss.config.js` em CJS com `plugins` (compatível com Next)
- [x] `.env.example` atualizado

## Sprint 5 — QA e deploy

- [x] `npm run build` a verde
- [ ] `npm run dev` local + smoke nas rotas críticas
- [ ] Alinhar `vercel.json`/CI se existir; documentar `NEXT_*` no deploy

---

**Convenção:** ficheiros de ecrã ficam em `src/views/`; rotas URL ficam em `src/app/`.
