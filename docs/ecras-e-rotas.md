# Aura Onco — Ecrãs, fluxos e rotas

Documento de referência: mapa de ecrãs, rotas (Expo Router) e correspondência com o fluxo de produto descrito. Os caminhos usam a convenção do projeto em `mobile/app/`.

---

## 1. Fluxo de abertura do app

| Momento | Comportamento desejado (produto) | Estado no código (referência) |
|--------|-----------------------------------|-------------------------------|
| Primeira abertura | Animação de apresentação em **3 ecrãs** antes de autenticação | Componente `OnboardingWalkthrough` no ecrã Resumo (`(tabs)/index`) após login; avaliar fluxo dedicado antes do login se for obrigatório “só na 1.ª vez global”. |
| Aberturas seguintes | Animação curta da **logo** (~1 s) antes do login | Splash nativo + `SplashScreen`; animação de logo curta pode ser ecrã dedicado ou extensão do splash. |
| Sem sessão | Ir para **login** | `app/index.tsx` → `Redirect` para `/login`. |
| Com sessão, sem consentimento LGPD | Ecrã de consentimento | `/lgpd-consent`. |
| Com sessão, sem perfil de paciente | Cadastro / onboarding | `/onboarding`. |
| Tudo ok | Área autenticada (tabs) | `Redirect` para `/(tabs)`. |

**Rotas envolvidas:** `/`, `/login`, `/lgpd-consent`, `/onboarding`, `/(tabs)`.

---

## 2. Autenticação e cadastro (especificação UX)

### 2.1 Ecrã Login (dedicado)

Conteúdo pedido:

- Logo, nome e descrição da app  
- Campo **login** (email ou identificador): Enter → foco na **senha**; opção de fechar teclado  
- Campo **senha**: Enter → **entrar**; fechar teclado; **ícone de olho** (mostrar/ocultar)  
- Botão **Entrar**  
- Botão **Entrar com Google**  
- Texto “Não tem conta? **Cadastre-se**” → navega para ecrã de cadastro  

**Rota alvo sugerida:** `/login` (`mobile/app/login.tsx`).

**Nota:** No repositório atual, `login.tsx` pode combinar modo login/registo num único ecrã; o produto descreve **login** e **cadastro** como ecrãs separados com link cruzado (ver secção 2.2).

---

### 2.2 Ecrã Cadastro (dedicado)

Conteúdo pedido:

- Logo, nome e descrição  
- **Card** paciente vs cuidador  
- Se **paciente**: escolha do **tipo de cancro**  
- Nome, telefone, login, senha (mesmas regras de teclado/Enter/olho que no login)  
- Botão de concluir cadastro / entrar  
- **Entrar com Google**  
- “Já tem conta? **Entrar**” → `/login`  

**Rotas relacionadas no projeto:**

| Rota | Ficheiro | Função |
|------|----------|--------|
| `/onboarding` | `app/onboarding.tsx` | Escolha paciente/cuidador, tipo de cancro (paciente), dados de perfil Supabase; fluxo pós-auth Google/email. |
| `/caregiver-claim` | `app/caregiver-claim.tsx` | Ligação cuidador ↔ paciente quando aplicável. |

Um ecrã “cadastro só email/senha” separado de `/onboarding` pode ser introduzido como `/signup` ou reutilizar `/onboarding` após definir stack (login → signup → onboarding mínimo).

---

### 2.3 OAuth / callback

| Rota | Ficheiro |
|------|----------|
| `/auth/callback` | `app/auth/callback.tsx` |

Tratamento do retorno do provedor (ex.: Google) após redirect.

---

## 3. Navegação principal (área autenticada)

### 3.1 Tabs inferiores (`app/(tabs)/_layout.tsx`)

| Tab (UI) | Rota inicial | Descrição |
|----------|--------------|-----------|
| **Resumo** | `/(tabs)` ou `/(tabs)/index` | Hub principal (saudação, tratamento, widgets, medicamentos, agenda, etc.). |
| **Exames** | `/(tabs)/exams` | Lista e detalhe de exames. |
| **Busca / Saúde** | `/(tabs)/health` | Stack “Saúde”: medicamentos, tratamento, vital signs, nutrição, diário, educação, agente. |

A barra usa `FloatingPillTabBar` (Resumo + Exames + botão orb para Saúde).

---

### 3.2 Stack Saúde (`app/(tabs)/health/_layout.tsx`)

Entrada típica: `/(tabs)/health` (**Buscar** / categorias). Lista resumida de segmentos:

| Rota (segmento) | Ficheiro |
|-----------------|----------|
| `health/index` | `health/index.tsx` |
| `health/diary` | `health/diary.tsx` |
| `health/agent` | `health/agent.tsx` |
| `health/education` | `health/education.tsx` |
| `health/medications/*` | `health/medications/_layout.tsx` + filhos |
| `health/vitals/*` | `health/vitals/_layout.tsx` + filhos |
| `health/nutrition/*` | `health/nutrition/_layout.tsx` + filhos |
| `health/treatment/*` | `health/treatment/_layout.tsx` + filhos |

**Detalhe completo de cada tela e rota:** secção **6** (aba Buscar / Saúde).

---

### 3.3 Exames (`app/(tabs)/exams/`)

Lista e detalhe — ver secção **5** (aba Exames).

---

### 3.4 Modais / stacks ao nível raiz (`app/_layout.tsx`)

| Rota | Título / apresentação | Ficheiro |
|------|------------------------|----------|
| `/calendar` | Agendamentos (stack próprio, header configurável) | `app/calendar.tsx` |
| `/reports` | Relatórios | `app/reports.tsx` |
| `/authorizations` | Acessos hospitalares | `app/authorizations.tsx` |
| `/lgpd-consent` | Privacidade (form sheet) | `app/lgpd-consent.tsx` |
| `/onboarding` | Cadastro (form sheet) | `app/onboarding.tsx` |
| `/caregiver-claim` | Cuidador | `app/caregiver-claim.tsx` |

Estas rotas são irmãs de `/(tabs)` no `Stack` raiz; podem ser abertas com `router.push` a partir do Resumo ou definições.

---

## 4. Aba Resumo — estrutura pedida vs âncoras de rota

| Secção (produto) | Conteúdo principal | Onde implementar / navegar |
|------------------|--------------------|----------------------------|
| **Header** | Bom dia/tarde/noite + primeiro nome; avatar à direita → **modal** perfil (animação de baixo, não full screen) | `/(tabs)/index` — `ProfileSheet`, `usePatient`, etc. |
| **Tratamento ativo** | Tipo, nome, sessões feitas/total, última/próxima infusão, link “Ver acompanhamento do ciclo”, gráfico circular % | `ActiveTreatmentCycleCard` + rotas `/(tabs)/health/treatment/[cycleId]` |
| **Métricas em foco** | Cards editáveis (exames/dados app); “Ajustar” → escolha de widgets | `WidgetPickerModal`, `resumoWidgets`, pins |
| **Próximas doses** | Medicamentos fixados no resumo; “Gerir medicamentos”; Tomado? / Não tomado? com registo | `/(tabs)/health/medications`, logs via `medicationLogWrite` / reconciliação |
| **Próximo agendamento** | Evento fixado; tipo, nome, dia, hora; “Ver Agenda” | `router.push('/calendar')` ou equivalente |
| **Nutrição e hábitos** | Atalho / secção | `/(tabs)/health/nutrition` |
| **Biblioteca de apoio** | Conteúdos educativos | `/(tabs)/health/education` |
| **Relatórios** | | `/reports` |
| **Atividades recentes** | Feed / histórico | Pode viver no próprio `index` ou deep link para diário/exames |

---

## 5. Aba **Exames** — stack, telas e rotas

Tab inferior **Exames** → stack em `mobile/app/(tabs)/exams/`. Ficheiro de layout: `exams/_layout.tsx`.

| Rota (Expo Router) | Ficheiro | Função / UI |
|--------------------|----------|-------------|
| `/(tabs)/exams` | `exams/index.tsx` | Lista de documentos/exames: filtros, ordenação, upload (câmara/ficheiro), OCR, pesquisa. |
| `/(tabs)/exams/[id]` | `exams/[id].tsx` | Detalhe de um exame/documento (`id` dinâmico). Header nativo “Detalhes”; gesto de voltar desativado no scroll (config do stack). |

**Parâmetro dinâmico:** `[id]` — identificador do registo de exame na app/Supabase.

**Navegação típica:** lista → `router.push('/(tabs)/exams/' + id)` (ou `href` equivalente).

---

## 6. Aba **Buscar** (Saúde) — hub, categorias e todas as telas internas

O botão orb **Buscar** nas tabs abre o stack `health` com rota inicial `/(tabs)/health`. O ecrã raiz (`health/index.tsx`) mostra o título **“Buscar”** e **“Categorias de Saúde”**, com linhas que navegam para sub-stacks ou rotas externas ao stack health.

### 6.1 Hub Buscar — `/(tabs)/health`

| Destino na UI | Rota | Notas |
|---------------|------|--------|
| Tratamento | `/(tabs)/health/treatment` | Stack tratamento |
| Medicamentos | `/(tabs)/health/medications` | Stack medicamentos (wizard + detalhe) |
| Sinais vitais | `/(tabs)/health/vitals` | Stack vitais |
| Nutrição | `/(tabs)/health/nutrition` | Stack nutrição |
| Exames | `/(tabs)/exams` | Tab **Exames** (sai do stack health) |
| Sintomas (diário) | `/(tabs)/health/diary` | Ecrã único |
| Agendamentos | `/calendar` | Modal/stack raiz (não é filho só de `health`) |

### 6.2 Telas avulso no stack `health` (sem sub-pasta própria)

| Rota | Ficheiro | Função |
|------|----------|--------|
| `/(tabs)/health/diary` | `health/diary.tsx` | Diário / sintomas |
| `/(tabs)/health/education` | `health/education.tsx` | Biblioteca de apoio / conteúdos |
| `/(tabs)/health/agent` | `health/agent.tsx` | Agente / assistente |

---

### 6.3 Tratamento — `health/treatment/*`

Layout: `health/treatment/_layout.tsx` (stack implícito com todos os ficheiros da pasta).

| Rota | Ficheiro | Função |
|------|----------|--------|
| `/(tabs)/health/treatment` | `treatment/index.tsx` | Lista de ciclos de tratamento |
| `/(tabs)/health/treatment/kind` | `treatment/kind.tsx` | Escolha do tipo de tratamento (fluxo criação) |
| `/(tabs)/health/treatment/name` | `treatment/name.tsx` | Nome do tratamento |
| `/(tabs)/health/treatment/schedule` | `treatment/schedule.tsx` | Agendamento / calendário do ciclo |
| `/(tabs)/health/treatment/details` | `treatment/details.tsx` | Detalhes na criação/edição do ciclo |
| `/(tabs)/health/treatment/[cycleId]` | `treatment/[cycleId]/index.tsx` | Detalhe do ciclo (acompanhamento) |
| `/(tabs)/health/treatment/[cycleId]/edit` | `treatment/[cycleId]/edit.tsx` | Editar ciclo |
| `/(tabs)/health/treatment/[cycleId]/checkin` | `treatment/[cycleId]/checkin.tsx` | Check-in do ciclo |
| `/(tabs)/health/treatment/[cycleId]/infusion/new` | `treatment/[cycleId]/infusion/new.tsx` | Registar nova infusão |
| `/(tabs)/health/treatment/[cycleId]/infusion/[infusionId]` | `treatment/[cycleId]/infusion/[infusionId].tsx` | Detalhe/editar infusão existente |

**Parâmetros:** `cycleId`, `infusionId` — IDs dos registos.

---

### 6.4 Medicamentos — `health/medications/*`

Layout: `health/medications/_layout.tsx` (com `MedicationWizardProvider`). Ordem típica do assistente: nome → tipo → dose → forma → cor → horários → rever → detalhe.

| Rota | Ficheiro | Função |
|------|----------|--------|
| `/(tabs)/health/medications` | `medications/index.tsx` | Lista / hub de medicamentos |
| `/(tabs)/health/medications/name` | `medications/name.tsx` | Passo: nome |
| `/(tabs)/health/medications/type` | `medications/type.tsx` | Passo: tipo |
| `/(tabs)/health/medications/dosage` | `medications/dosage.tsx` | Passo: dosagem |
| `/(tabs)/health/medications/shape` | `medications/shape.tsx` | Passo: forma farmacêutica |
| `/(tabs)/health/medications/color` | `medications/color.tsx` | Passo: cor/aparência |
| `/(tabs)/health/medications/schedule` | `medications/schedule.tsx` | Passo: horários / periodicidade |
| `/(tabs)/health/medications/review` | `medications/review.tsx` | Rever e confirmar |
| `/(tabs)/health/medications/detail` | `medications/detail.tsx` | Detalhe de um medicamento |

---

### 6.5 Sinais vitais — `health/vitals/*`

Layout: `health/vitals/_layout.tsx`.

| Rota | Ficheiro | Função |
|------|----------|--------|
| `/(tabs)/health/vitals` | `vitals/index.tsx` | Hub de vitais (lista por tipo, últimos valores) |
| `/(tabs)/health/vitals/log` | `vitals/log.tsx` | Registo genérico / fluxo de log |
| `/(tabs)/health/vitals/[type]` | `vitals/[type].tsx` | Detalhe e registo por tipo |

**Valores usados para `[type]`** (ver `src/health/vitalsConfig.ts` / `VitalType`): `temperature`, `heart_rate`, `blood_pressure`, `glucose`, `spo2`, `weight`.

Exemplo: `/(tabs)/health/vitals/temperature`, `/(tabs)/health/vitals/blood_pressure`.

---

### 6.6 Nutrição — `health/nutrition/*`

Layout: `health/nutrition/_layout.tsx`.

| Rota | Ficheiro | Função |
|------|----------|--------|
| `/(tabs)/health/nutrition` | `nutrition/index.tsx` | Hub nutrição |
| `/(tabs)/health/nutrition/log` | `nutrition/log.tsx` | Registo (refeições / hábitos) |

---

### 6.7 Resumo visual — árvore sob `/(tabs)/health`

```
/(tabs)/health                    → Buscar (hub)
/(tabs)/health/diary              → Sintomas
/(tabs)/health/education          → Biblioteca
/(tabs)/health/agent              → Agente
/(tabs)/health/treatment/...
/(tabs)/health/medications/...
/(tabs)/health/vitals/...
/(tabs)/health/nutrition/...
```

Rotas relacionadas fora deste stack mas ligadas pelo hub: `/(tabs)/exams`, `/calendar`.

---

## 7. Tabela resumo de rotas (referência rápida)

| Caminho | Ecrã |
|---------|------|
| `/` | Entrada: redireciona conforme sessão, LGPD, paciente |
| `/login` | Login (e eventualmente modo registo no mesmo ficheiro) |
| `/auth/callback` | Callback OAuth |
| `/lgpd-consent` | Consentimento |
| `/onboarding` | Cadastro paciente/cuidador + cancro + dados |
| `/caregiver-claim` | Reivindicação cuidador |
| `/calendar` | Agenda / agendamentos |
| `/reports` | Relatórios |
| `/authorizations` | Autorizações hospitalares |
| `/(tabs)` | Container tabs |
| `/(tabs)/index` | **Resumo** |
| `/(tabs)/exams` | Exames |
| `/(tabs)/exams/[id]` | Detalhe exame |
| `/(tabs)/health` | Hub Saúde / busca |
| `/(tabs)/health/medications` | Medicamentos |
| `/(tabs)/health/treatment/...` | Tratamento e ciclos |
| `/(tabs)/health/vitals/...` | Sinais vitais |
| `/(tabs)/health/nutrition/...` | Nutrição |
| `/(tabs)/health/diary` | Diário |
| `/(tabs)/health/education` | Educação |
| `/(tabs)/health/agent` | Agente |

---

## 8. Gaps / alinhamento com a especificação

1. **Login e cadastro em ecrãs distintos** com links “Cadastre-se” / “Entrar”: ajustar `login.tsx` ou criar `signup.tsx` conforme design.  
2. **Animação inicial 3 ecrãs** antes de qualquer login: pode exigir rota `/welcome` ou flag em `AsyncStorage` antes de mostrar `/login`.  
3. **Logo ~1 s** antes do login nas aberturas seguintes: ecrã intermediário ou splash estendido.  
4. **Agendamentos**: ecrã principal em `/calendar`; garantir que “fixar no resumo” e “Ver Agenda” apontam para esta rota de forma consistente.  

---

*Última atualização: gerado a partir da estrutura `mobile/app/` e da especificação funcional fornecida.*
