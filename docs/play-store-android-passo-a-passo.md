# Passo a passo: Aura Onco no Android — da máquina à Play Store

Este guia cobre o caminho desde a configuração local até publicar o app **Aura Onco** (Expo em `mobile/`) na Google Play, incluindo **teste interno** e **produção**.

**Identificador Android no projeto:** `com.auraonco.app` (`expo.android.package` em `mobile/app.json`). Esse ID é **definitivo** depois que a primeira versão com ele é publicada na Play — não mude sem migrar app na loja.

Este documento **não substitui** as políticas oficiais. Para o texto integral e atualizações, use sempre a [Central de ajuda para programadores](https://support.google.com/googleplay/android-developer/) e a pré-visualização de **Requisitos da Play Console** na própria consola.

---

## Requisitos da Play Console e apps de saúde (Aura Onco)

A Aura Onco enquadra-se em **apps médicas e de saúde**. O Google Play exige, entre outras coisas, o **tipo de conta correto**, declarações na consola, privacidade e revisão. Resumo operacional (alinhado à política pública; em caso de dúvida prevalece sempre a política integral na Google):

### Conta de programador: pessoal vs organização

- Para **apps de saúde** (incl. médicas e apps de investigação em seres humanos), o registo deve ser como **organização**, não como conta pessoal, quando a política assim o exige.
- Organizações precisam de dados **legais** (nome, morada), **DUNS** (Dun & Bradstreet) quando aplicável, contactos válidos e coerência com o perfil de pagamentos / identidade apresentada na Play.
- Se a app estiver numa **conta pessoal** e a consola indicar violação de “requisitos da Play Console”, o caminho típico é: **conta de organização** + **transferência da app** ou do programador pelo fluxo oficial (ver “Transferência de propriedade” na consola).

**Política de transferência de contas (anúncio recente):** a Google reforça o uso do fluxo oficial **Transfer ownership** na Play Console para transferências elegíveis; há pré-visualização do artigo “Requisitos da Play Console” atualizado na consola. **Data referida nas comunicações:** 27 de maio de 2026 para parte das regras — confirme sempre a data no documento oficial vigente.

### Formulário declarativo para apps de saúde

- Em **Monitorizar e melhorar → Política → Conteúdo da app**, preencha o **formulário declarativo para apps de saúde** com precisão (categorias, dados, funcionalidades).
- O que declarar na consola tem de ser **consistente** com a app real, a **Secção segurança dos dados** e a **Política de privacidade**.

### Política de privacidade e divulgação

- **Na Play Console:** URL da política no campo indicado; a página tem de estar **acessível**, em princípio **HTML** (evitar PDF como único meio se a política exigir URL “sem perímetro” — siga o que a consola e a política de dados pedirem).
- **Na app:** link ou texto de política de privacidade acessível ao utilizador (no Aura Onco existem ligações nos ajustes do perfil; mantenha URLs atualizados e coerentes com a ficha da loja).
- A política deve cobrir **acesso, recolha, uso e partilha** de dados pessoais e sensíveis de forma abrangente, não só o resumo da “segurança dos dados”.

### Leis de proteção de dados e privacidade (COPPA, GDPR, LGPD, …)

As regras da **Play Console** e a **Secção segurança dos dados** ajudam a alinhar a ficha com o que a Google exige, mas **não substituem** as leis aplicáveis no sítio onde os utilizadores vivem ou onde a vossa organização opera.

- **GDPR (UE/EEE):** se tratam dados pessoais de residentes na União Europeia, podem aplicar-se obrigações sobre base legal, transparência, direitos dos titulares (acesso, apagamento, portabilidade, etc.), contratos com subprocessadores, transferências internacionais e, em certos casos, avaliação de impacto ou DPO.
- **COPPA (EUA):** se a app for **dirigida a crianças** nos EUA ou recolher dados de menores de 13 anos de forma abrangida à lei, há requisitos específicos (incl. consentimento parental verificável onde aplicável). Isto **cruza** com o **público-alvo** e a **Política para famílias** na Play quando incluem crianças.
- **LGPD (Brasil):** se há utilizadores ou operações no Brasil, avaliem bases legais, direitos dos titulares, registo de operações, DPO quando obrigatório e medidas de segurança adequadas a dados sensíveis de saúde, quando couber.

**Manual:** definir com **assessoria jurídica** qual o enquadramento (mercados, idades, dados de saúde), atualizar **política de privacidade**, processos internos e o que declarar na consola de forma **coerente**. Este repositório não fornece aconselhamento jurídico.

### Permissões e dados de saúde

- Pedir apenas permissões **necessárias** à funcionalidade essencial; remover permissões não usadas.
- Dados de saúde / sensíveis: alinhar com a política de **apps de saúde** e com a lista de permissações no âmbito de dados confidenciais (documentação Google: “Que autorizações estão no âmbito…”).

### Funcionalidades médicas e descrição na loja

- Apps **não** reguladas como dispositivo médico devem incluir **exclusão de responsabilidade** clara na descrição (ex.: a app **não** é um dispositivo médico e **não** diagnostica, trata, cura nem previne doenças — adapte ao texto aprovado pela vossa assessoria).
- Reforçar que o utilizador deve **consultar um profissional de saúde** para diagnóstico ou tratamento.
- Se no futuro houver classificação como dispositivo médico ou comprovativos regulamentares, siga os requisitos específicos da política e da consola.

### Conta de demonstração para revisão

- Fornecer **credenciais de teste** ativas (utilizador + palavra-passe ou método acordado pela consola), mais instruções para chegar às áreas sensíveis (ex.: ecrã pós-login). Sem isto, a revisão pode falhar ou atrasar.

### O que a equipa deve rever periodicamente

- Contrato de distribuição e **Políticas do programa para programadores** na íntegra.
- **Data safety** e declarações sempre alinhadas com novas funcionalidades ou SDKs.
- Apelos (“contestação”) só depois de corrigir ou documentar o que a Google indicar nos detalhes do problema.

---

## Parte 0 — O que você precisa antes

1. **Conta Google** (para Play Console e, se quiser, Google Cloud).
2. **Conta de desenvolvedor Google Play** — taxa única (verifique o valor atual em [Google Play Console](https://play.google.com/console)). Sem isso não dá para publicar.
3. **Conta Expo** — [expo.dev](https://expo.dev); usada para EAS Build (build do `.aab` na nuvem).
4. **URLs e chaves** do seu ambiente:
   - Projeto **Supabase** (URL + chave anon).
   - **API** do backend (URL pública HTTPS em produção, ex.: `https://api.seudominio.com`).
5. **Política de privacidade** em URL pública — a Play exige para a ficha do app (pode ser uma página no site ou documento hospedado).

---

## Parte 1 — Preparar o projeto no computador

1. Instale **Node.js 20+** e o **Git**.
2. Clone o repositório e entre na pasta do app mobile:

   ```bash
   cd mobile
   npm install
   ```

3. (Opcional, só para testar localmente) Crie `mobile/.env` com as mesmas variáveis que o build na nuvem usará — ver `mobile/app.config.js` e `mobile/README.md`.

---

## Parte 2 — Conta Expo e EAS (ligar o app ao Expo)

Objetivo: poder rodar builds na nuvem e gravar o **project ID** no projeto.

1. Faça login no EAS:

   ```bash
   cd mobile
   npm run eas:login
   ```

   Ou: `npx eas login`

2. Associe o projeto ao EAS e configure Android:

   ```bash
   npm run eas:configure
   ```

   Ou: `npx eas build:configure -p android`

3. O comando acima costuma **atualizar** `mobile/app.json` com `expo.extra.eas.projectId`. **Faça commit** desse `app.json` no Git — assim CI e outros devs reproduzem o mesmo projeto Expo.

4. Confirme que existe `mobile/eas.json` com perfil `production` gerando **AAB** (`app-bundle`), como já está no repositório.

### Mudar para outra organização ou projeto Expo

O EAS associa cada build ao projeto identificado por `expo.extra.eas.projectId` em `mobile/app.json`. **Builds já concluídos** ficam no projeto antigo; o que você muda são os **próximos** builds.

**Opção A — Novo projeto na organização certa (mais comum)**

1. Em [expo.dev](https://expo.dev), troque para a **organização** desejada (menu da conta / seletor de time).
2. Crie um **novo projeto** (por exemplo mesmo `slug` `aura-onco`, se ainda não existir nessa org) ou abra um projeto vazio já criado aí.
3. Nas definições do projeto, copie o **Project ID** (UUID).
4. No repositório, edite `mobile/app.json`:
   - Em `expo`, acrescente o dono explícito (slug da org ou utilizador na Expo):

     ```json
     "owner": "slug-da-sua-organizacao",
     ```

   - Em `expo.extra.eas`, substitua `projectId` pelo UUID do **novo** projeto.

5. No terminal (com sessão ligada à conta que tem acesso à org):

   ```bash
   cd mobile
   npx eas whoami
   npx eas build:configure -p android
   ```

   O `build:configure` confirma o link; se pedir, escolha o projeto certo.

6. **Segredos e credenciais** ficam por **projeto** na Expo: volte a criar os **EAS Secrets** (`EXPO_PUBLIC_*`, etc.) no novo projeto (painel do projeto → Secrets ou `eas secret:create` já com esse `app.json` atualizado).

7. **Android (keystore):** credenciais de assinatura ficam ligadas ao projeto Expo. Num projeto novo, o primeiro build pode criar **nova** keystore na nuvem — ok para app ainda não na Play; se já publicaste com a keystore antiga, precisas de **continuar com a mesma assinatura** para atualizar o mesmo app na Play (caso complexo: ver [credenciais EAS](https://docs.expo.dev/app-signing/app-credentials/) / suporte Expo para migrar keystore entre projetos).

**Opção B — Transferir o projeto na Expo**

Se a Expo permitir **transferência** do projeto entre contas/orgs para o mesmo `projectId`, usa as opções em **Project settings** no dashboard (ou documentação atual “transfer project”). Assim manténs histórico de builds e segredos no mesmo ID — depende da política e UI atuais da Expo.

---

## Parte 3 — Segredos no EAS (build na nuvem com Supabase/API)

No EAS Build, o `app.config.js` roda na nuvem e lê variáveis de ambiente. Crie **segredos** com **exatamente** estes nomes (valores reais da produção ou do ambiente que você quer no APK/AAB):

```bash
cd mobile

npx eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://SEU_PROJETO.supabase.co"
npx eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "SUA_CHAVE_ANON"
npx eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://sua-api-publica.com/"
npx eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "https://SUA_DSN_SENTRY.ingest.sentry.io/..."
```

- **Sentry (opcional mas recomendado):** `EXPO_PUBLIC_SENTRY_DSN` é lida em `mobile/app.config.js` e injetada em `expo.extra.sentryDsn` para o cliente mobile (`initSentry`). O DSN de projeto Sentry não é segredo crítico como uma chave de API privada, mas mantenha-o nos **EAS Secrets** em vez de em texto no repositório.
- Se já existir segredo com o mesmo nome, use `--force` para sobrescrever (veja `eas secret:create --help`).
- Alternativa: painel **expo.dev** → seu projeto → **Secrets**.

Sem isso, o app compilado pode ficar com URLs vazias.

---

## Parte 4 — Gerar o Android App Bundle (.aab)

1. Dispare o build de produção:

   ```bash
   cd mobile
   npm run eas:build:android
   ```

   Ou: `npx eas build --platform android --profile production`

2. Acompanhe no terminal ou em [expo.dev](https://expo.dev) → seu projeto → **Builds**.

3. **Primeira vez:** o EAS pode pedir para criar a **keystore** Android (assinatura). Aceite e **guarde** as credenciais / backup que a Expo oferecer — sem isso não atualiza o mesmo app na loja com segurança.

4. Ao terminar, **baixe o arquivo `.aab`** no dashboard Expo.

---

## Parte 5 — Google Play Console — criar o app e preencher o mínimo

1. Acesse [Google Play Console](https://play.google.com/console) com a conta da taxa de desenvolvedor.

2. **Criar app** → preencha nome, idioma padrão, tipo (app / jogo), gratuito ou pago.

3. Complete as tarefas que a consola exige para **qualquer** faixa (incluindo testes), em geral:
   - **Política de privacidade** (URL).
   - Declarações de **segurança de dados** (formulário sobre dados coletados).
   - **Classificação de conteúdo** (questionário).
   - **Países/regiões** onde o app será distribuído.
   - Em muitos casos: **ícone**, **capturas de tela**, **descrição curta/longa** — a Play pode bloquear release até isso estar aceitável para o estado do app (teste interno costuma ser mais leve que produção, mas ainda há requisitos).

4. Na secção de **assinaturas de apps**, confira que o **nome do pacote** esperado é `com.auraonco.app` (deve bater com `app.json`).

---

## Parte 6 — Teste interno (recomendado antes da loja pública)

1. No menu lateral: **Teste** → **Teste interno** (ou equivalente na sua língua da consola).

2. Crie uma **nova release** → faça **upload do `.aab`** gerado pelo EAS.

3. Adicione **testadores** (e-mails ou grupo do Google) e use o **link de opt-in** que a Play gera.

4. Envie a release para **revisão** se a consola pedir; aguarde o processamento (pode levar de minutos a horas).

5. Testadores instalam pelo **link de teste** ou pela Play Store, conforme a Play indicar.

Objetivo: validar instalação, login, Supabase e API em dispositivos reais antes de abrir para todos.

---

## Parte 7 — Testes fechados / abertos (opcional)

Muitos times passam por:

- **Teste fechado** — lista maior de testers, ainda não é “produção” para o mundo todo.
- **Teste aberto** — qualquer um pode entrar (com limite de testers, conforme regras atuais da Google).

Os passos são parecidos: nova faixa → nova release → mesmo `.aab` (ou build novo com `versionCode` maior — o EAS com `autoIncrement` ajuda nos próximos builds).

---

## Parte 8 — Produção na Play Store (lançamento para todos)

1. Quando o app estiver estável nos testes, vá em **Produção** (ou **Lançamento** → **Produção**).

2. Crie uma **nova release** de produção → envie um **`.aab`** com **versionCode** maior que qualquer um já usado na faixa (novo build EAS com `version`/`versionCode` atualizados em `app.json` se necessário).

3. Preencha **notas da versão** (o que mudou).

4. Envie para **revisão** da Google. Aprovação pode levar horas ou dias.

5. Após **publicado**, o app aparece na Play Store nos países selecionados (pode haver atraso de propagação).

---

## Parte 9 — Atualizações futuras

1. Aumente `version` em `mobile/app.json` (ex.: `1.0.1`) e, se não usar só o `autoIncrement` do EAS, ajuste `android.versionCode`.

2. Rode de novo:

   ```bash
   npm run eas:build:android
   ```

3. Na Play Console, **nova release** na faixa desejada (produção ou teste) com o novo `.aab`.

4. **Não reutilize** um `versionCode` já enviado à Play para o mesmo pacote.

---

## Parte 10 — Envio automático do `.aab` (opcional)

Para não baixar o `.aab` manualmente, dá para usar:

```bash
cd mobile
npm run eas:submit:android
```

Isso exige configurar a **conta de serviço** da Google Cloud ligada à Play Console (JSON de serviço, permissões na Play). Útil para CI; o fluxo manual (upload na consola) também é válido.

---

## Checklist rápido

| Etapa | Feito? |
|--------|--------|
| Conta desenvolvedor Google Play ativa (**tipo adequado**: organização para app de saúde, conforme política) | ☐ |
| Dados legais / DUNS / contactos coerentes com a organização | ☐ |
| Conta Expo + `eas login` | ☐ |
| `eas build:configure` e `projectId` commitado | ☐ |
| Segredos `EXPO_PUBLIC_*` no EAS | ☐ |
| Build EAS Android `production` → `.aab` | ☐ |
| App criado na Play com pacote `com.auraonco.app` | ☐ |
| Política de privacidade (URL na consola + acesso na app) | ☐ |
| **Formulário declarativo para apps de saúde** + Secção segurança dos dados alinhadas | ☐ |
| Descrição na loja com **exclusão de responsabilidade** médica adequada (se não for dispositivo médico) | ☐ |
| **Conta de demonstração** + instruções para revisores | ☐ |
| Transferências de app/conta apenas via fluxo oficial na consola (política de transferência) | ☐ |
| Teste interno com `.aab` e testers | ☐ |
| Produção com `.aab` e revisão aprovada | ☐ |

---

## Onde está o detalhe técnico no repositório

- Comandos resumidos: [`mobile/README.md`](../mobile/README.md) (secção EAS).
- Perfis de build: [`mobile/eas.json`](../mobile/eas.json).
- Variáveis injetadas no app: [`mobile/app.config.js`](../mobile/app.config.js).
- **Página do programador** (ícone 512×512, cabeçalho 4096×2304, texto ≤140 caracteres): gere com `npm run store:developer-page` em `mobile/`. Ficheiros em [`mobile/assets/store/`](../mobile/assets/store/): `play-developer-icon-512.jpg`, `play-developer-header-4096x2304.jpg`, `play-developer-promo-pt.txt` (copie o texto para a consola; pode adicionar traduções por país).

Se algo falhar no build (por exemplo **Nova Arquitetura**), veja o log do EAS e a documentação Expo para o SDK do projeto.
