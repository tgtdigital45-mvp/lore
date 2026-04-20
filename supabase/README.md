# OncoCare — Supabase (PostgreSQL, Auth, Realtime, Edge Functions)

**Sumário para a empresa:** o Supabase é a **fonte de verdade** dos dados clínicos e operacionais do OncoCare: utilizadores (Auth), perfis staff, vínculos paciente–hospital, diários, exames, alertas, agendamentos e eventos de mensagens. As **migrações SQL** versionam o esquema, funções, políticas **RLS** e triggers; as **Edge Functions** executam tarefas agendadas ou invocações HTTP isoladas em Deno.

---

## 1. Migrações (`migrations/`)

Aplicar **sempre por ordem cronológica** do prefixo do ficheiro (`YYYYMMDDHHMMSS_nome.sql`).

### 1.1 Linhas temáticas recentes (referência de produto)

| Tema | Exemplos de migrações |
|------|------------------------|
| **Regras de alerta** | `patient_alert_rules`, colunas e tipos garantidos por migrações incrementais. |
| **Staff e demo** | RPC de atribuição demo (`claim_demo_staff_assignment`), guardas de atualização de `profiles.role`. |
| **Ficha médica** | Extensão de campos da ficha (`ficha_medica_extended_fields`). |
| **Oncologia estratégica** | Expansão de dados/enum relacionados ao plano clínico. |
| **Agendamentos** | Check-in e fluxos de `patient_appointments`. |
| **Vínculo paciente–hospital** | Pesquisa por código, histórico de reabertura de link, eventos e **Realtime** para o dashboard. |
| **WhatsApp inbound** | Tabela e políticas para mensagens recebidas (alinhado ao webhook Evolution no backend). |

Para o detalhe relacional e RLS, cruzar com [`../docs/arquitetura-bd.md`](../docs/arquitetura-bd.md) e com o SQL em cada ficheiro.

**CLI típico:** `supabase db push` ou execução manual no SQL Editor do projeto — conforme processo interno.

---

## 2. Edge Functions (`functions/`)

Ver **[`functions/README.md`](functions/README.md)** — inclui segredos (`CRON_SECRET`), contrato de autorização e **novas funções** (relatório de evolução, questionário PRO).

---

## 3. Segurança (mensagem única)

- **Service role** apenas em Edge Functions e no backend Node — nunca em apps Expo ou Vite expostos ao utilizador.
- **RLS** é a barreira principal entre pacientes, hospitais e staff.
- Não commitar ficheiros `.env` da pasta `supabase/` com project refs ou keys (o `.gitignore` da raiz cobre padrões comuns).

---

## 4. Índice de documentação

| Documento | Conteúdo |
|-----------|-----------|
| [`../README.md`](../README.md) | Arquitetura do monorepo, arranque, compliance resumido |
| [`functions/README.md`](functions/README.md) | Inventário e invocação das Edge Functions |
| [`../docs/SECURITY.md`](../docs/SECURITY.md) | Práticas de segurança |
| [`../docs/arquitetura-bd.md`](../docs/arquitetura-bd.md) | Modelo de dados |

---

*Documentação de pasta para alinhamento entre equipa de produto, engenharia de dados e operações de base de dados.*
