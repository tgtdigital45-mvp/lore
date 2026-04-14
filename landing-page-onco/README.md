# OncoCare — Landing page (marketing)

Site **público** de apresentação do produto OncoCare: Vite, React, TypeScript e **Tailwind CSS v4**. Não usa Supabase nem backend — apenas conteúdo estático e rotas client-side.

## Stack

- **Vite 8**, **React 19**, **React Router 7**
- **Tailwind CSS v4** (`@tailwindcss/vite`)
- **TypeScript**
- **Error Boundary** global em [`src/main.tsx`](src/main.tsx) → [`src/components/ErrorBoundary.tsx`](src/components/ErrorBoundary.tsx) (evita SPA em branco em erro não tratado)

## Pré-requisitos

- Node 20+

## Comandos

```bash
cd landing-page-onco
npm install
npm run dev
```

Build e pré-visualização:

```bash
npm run build
npm run preview
```

Lint: `npm run lint`

## Rotas

| Caminho | Página |
|---------|--------|
| `/` | Landing (home) |
| `/sobre` | Sobre nós |
| `/carreiras` | Carreiras |
| `/contato` | Contato (canais + formulário → mailto) |
| `/termos` | Termos de uso |
| `/privacidade` | Política de privacidade (âncora `#lgpd`) |
| `/lgpd` | LGPD / direitos do titular |

Os links do rodapé em **Produto** apontam para âncoras na home (`/#features-heading`, etc.). Em deploy na Vercel, [`vercel.json`](vercel.json) faz fallback SPA para `index.html`.

## Deploy na Vercel

Guia completo (monorepo, Root Directory `landing-page-onco`, CLI, domínio): **[`VERCEL.md`](VERCEL.md)**.

Resumo: no painel da Vercel, define **Root Directory** = `landing-page-onco`; build `npm run build`; output `dist`. O `vercel.json` garante que rotas como `/sobre` não dão 404 ao refrescar a página.

## Antes de produção

Substituir placeholders: links **App Store / Google Play** (`#`), e-mails de exemplo (`contato@oncocare.app`, `comercial@oncocare.app`, `privacidade@oncocare.app`, `rh@oncocare.app`) quando URLs e domínios oficiais estiverem definidos.

## Documentação do monorepo

- Produto e stack geral: [`../README.md`](../README.md)
- Backlog: [`../TODO_MASTER.md`](../TODO_MASTER.md)
- Relatório: [`../docs/RELATORIO-PROJETO.md`](../docs/RELATORIO-PROJETO.md)
