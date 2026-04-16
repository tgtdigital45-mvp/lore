# OncoCare — App mobile (Expo)

Aplicação para **pacientes**: diário de sintomas, medicamentos, tratamento, exames/OCR, calendário, relatórios PDF, vinculação com hospital e consentimentos LGPD.

## Stack

- **Expo SDK ~54**, **expo-router** (file-based routes)
- **React** + **TypeScript**
- **Supabase** (Auth, Postgres via cliente, Storage)
- **TanStack Query** em parte dos fluxos
- **expo-notifications**, **expo-print**, **expo-sharing**, etc.

## Pré-requisitos

- Node 20+
- Conta **Supabase** (mesmo projeto que o backend e o dashboard)
- Para OCR, agente e exames: **oncocare-backend** a correr (instruções em [`../README.md`](../README.md) secção Backend; variáveis em [`../backend/.env.example`](../backend/.env.example))

## Variáveis de ambiente

Crie `mobile/.env` (ou use a raiz do repo / `backend/.env` — ver [`app.config.js`](app.config.js)).

| Variável | Descrição |
|----------|-----------|
| `EXPO_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Chave **anon** (pública) do Supabase |
| `EXPO_PUBLIC_API_URL` | URL base do **oncocare-backend** (ex.: `http://localhost:3001` — alinhar com `PORT` do backend; em Android emulador frequentemente `http://10.0.2.2:3001`; em dispositivo físico, IP da máquina na LAN) |

Alternativas aceites pelo `app.config.js`: `SUPABASE_URL` / `SUPABASE_ANON_KEY` (úteis se partilhares o `.env` do backend).

## Comandos

```bash
cd mobile
npm install
npm run start
# ou
npm run android
npm run ios
npm run web
```

Limpar cache do Metro: `npm run start:clear`

Typecheck: `npm run typecheck`

## Estrutura (resumo)

| Pasta / ficheiro | Conteúdo |
|------------------|----------|
| `app/` | Rotas Expo Router (tabs, tratamento, saúde, exames, etc.) |
| `src/auth/` | AuthContext, OAuth (Google, Apple) |
| `src/hooks/` | Dados Supabase, consentimentos, ciclos, etc. |
| `src/lib/supabase.ts` | Cliente Supabase (SecureStore / web) |

## Documentação do monorepo

- Visão geral: [`../README.md`](../README.md)
- PRD / backlog: [`../TODO_MASTER.md`](../TODO_MASTER.md)
- Relatório do projeto: [`../docs/RELATORIO-PROJETO.md`](../docs/RELATORIO-PROJETO.md)
- Segurança: [`../docs/SECURITY.md`](../docs/SECURITY.md)

## EAS Build (Android / Google Play — teste interno)

Guia completo (da configuração à produção na Play Store): [`../docs/play-store-android-passo-a-passo.md`](../docs/play-store-android-passo-a-passo.md).

O `applicationId` Android está em `app.json` → `expo.android.package` (`com.auraonco.app`). O perfil `production` em [`eas.json`](eas.json) gera **AAB** (`buildType: app-bundle`), com `autoIncrement` do `versionCode` em builds de produção.

### 1. Conta Expo e projeto EAS (uma vez)

```bash
cd mobile
npm install
npx eas login
npx eas build:configure -p android
```

O último comando associa o projeto ao EAS e grava `expo.extra.eas.projectId` em `app.json` (o [`app.config.js`](app.config.js) preserva `config.extra` ao injetar Supabase/API).

### 2. Segredos no EAS (build na nuvem)

O [`app.config.js`](app.config.js) lê `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` e `EXPO_PUBLIC_API_URL` no momento do build. Crie segredos com os **mesmos nomes** (ficam disponíveis como variáveis de ambiente no build):

```bash
npx eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://<projeto>.supabase.co"
npx eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon key>"
npx eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://<sua-api>/"
```

(Alternativa: painel [expo.dev](https://expo.dev) → projeto → Secrets.)

### 3. Gerar o AAB

```bash
npx eas build --platform android --profile production
```

Na primeira vez, o EAS ajuda a criar a keystore Android; guarde as credenciais e faça backup.

### 4. Google Play Console — teste interno

1. Crie a app na Play Console (se ainda não existir) e preencha os requisitos mínimos da ficha (privacidade, conteúdo, etc.).
2. **Teste interno** → nova release → carregar o **.aab** (descarregue do dashboard EAS ou use `npx eas submit --platform android --latest` com conta de serviço configurada).
3. Adicione testers por e-mail ou grupo Google e partilhe o link de opt-in do teste interno.

### Comandos npm úteis

| Script | Comando |
|--------|---------|
| `npm run eas:login` | `eas login` |
| `npm run eas:configure` | `eas build:configure -p android` |
| `npm run eas:build:android` | `eas build --platform android --profile production` |
| `npm run eas:submit:android` | `eas submit --platform android --latest` |
| `npm run store:feature-graphic` | Recurso 1024×500 para a ficha do app |
| `npm run store:developer-page` | Ícone 512 + cabeçalho 4096×2304 + promo (ficheiros em `assets/store/`) |

## Notas

- **`expo-doctor`:** o [`app.config.js`](app.config.js) usa `dotenv` com `quiet: true` para não imprimir linhas `◇ injected env` no stdout. O dotenv v17 fazia isso por defeito e estragava o check de versões do SDK (falso negativo com `upToDate: true`). Comando: `npm run doctor`.
- Não commite ficheiros `.env` com chaves reais.
- O backend usa **JWT** do Supabase; o app envia o token nas chamadas à API Express quando aplicável.
