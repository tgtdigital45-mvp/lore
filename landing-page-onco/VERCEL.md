# Deploy na Vercel — Landing Onco

Este projeto é uma **SPA** (Vite + React Router). Todas as rotas (`/sobre`, `/contato`, …) são resolvidas no cliente; o servidor tem de devolver sempre `index.html` para caminhos diretos e refreshes — por isso existe [`vercel.json`](vercel.json) com **rewrite** catch-all.

## Requisitos

- Conta [Vercel](https://vercel.com) ligada ao GitHub (ou GitLab/Bitbucket).
- Repositório com este código (monorepo: a raiz do Git **não** é a pasta da landing).

## Opção A — Dashboard Vercel (recomendado)

1. **Add New Project** → importar o repositório.
2. **Root Directory:** `landing-page-onco`  
   (obrigatório em monorepo; caso contrário a Vercel tenta fazer build na raiz, onde não há `package.json` da app.)
3. **Framework Preset:** Vite (deteção automática em geral).
4. **Build Command:** `npm run build` (por defeito).
5. **Output Directory:** `dist` (por defeito no Vite).
6. **Install Command:** `npm install` (por defeito).
7. Guardar e fazer deploy.

Variáveis de ambiente: **não são obrigatórias** para esta landing (não usa `VITE_*` para APIs). Se no futuro adicionares analytics (`VITE_*`), define-as no painel da Vercel e volta a fazer deploy.

## Opção B — Vercel CLI

Na máquina local (com CLI instalada: `npm i -g vercel`):

```bash
cd landing-page-onco
vercel        # preview
vercel --prod # produção
```

Na primeira vez, indica **Root Directory** `landing-page-onco` se estiveres a ligar ao projeto a partir da raiz do repo, ou executa os comandos **dentro** de `landing-page-onco` como acima.

## Ficheiro `vercel.json`

| Campo | Função |
|-------|--------|
| `rewrites` | Qualquer caminho `/*` serve `index.html`, permitindo React Router e refresh em URLs profundas. |

Sem este rewrite, um pedido direto a `https://teu-dominio.com/sobre` devolveria 404.

## Domínio customizado

No projeto Vercel: **Settings → Domains** → adicionar o domínio e seguir a verificação DNS (registo A/CNAME conforme instruções).

## Build local (validação antes do deploy)

```bash
cd landing-page-onco
npm install
npm run build
npm run preview
```

Se `preview` estiver correto, o deploy na Vercel com os mesmos comandos deve corresponder.

## Referências

- [Vite na Vercel](https://vercel.com/docs/frameworks/vite)
- [Monorepos](https://vercel.com/docs/monorepos) — Root Directory por aplicação
