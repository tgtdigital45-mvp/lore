# OncoCare — Dashboard Hospitalar (Next.js 15)

**Sumário executivo:** O **OncoCare Dashboard** é o centro de comando clínico e administrativo para hospitais oncológicos. Desenvolvido em **Next.js 15 (App Router)**, permite triagem em tempo real, gestão longitudinal de dossiês de pacientes, agendamentos sincronizados e comunicação integrada (WhatsApp). Consome **Supabase** para dados/autenticação e um **Backend Express** para operações críticas (OCR, IA, R2).

---

## 📑 Índice

1. [Visão do Produto](#1-visão-do-produto)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Camadas Lógicas](#3-camadas-lógicas)
4. [Fluxos Principais](#4-fluxos-principais)
5. [Estrutura do Projeto](#5-estrutura-do-projeto)
6. [Stack Tecnológica](#6-stack-tecnológica)
7. [Bibliotecas e Dependências](#7-bibliotecas-e-dependências)
8. [Arranque e Configuração (Setup)](#8-arranque-e-configuração-setup)
9. [Segurança e Compliance](#9-segurança-e-compliance)
10. [Roadmap](#10-roadmap)
11. [Licença](#11-licença)

---

## 🎯 1. Visão do Produto

O dashboard resolve o "gap" de informação entre o paciente (mobile) e a equipa clínica, oferecendo uma visão 360º do paciente sem necessidade de múltiplos sistemas manuais.

| Capacidade | Descrição |
|------------|-----------|
| **Workspace de Início** | Localizado em `/inicio`, apresenta a fila de triagem dinâmica com alertas de risco (Nadir, Febre). |
| **Dossiê Clínico** | Acesso via `/inicio/:patientId`. Painel denso com visão 3D anatómica, métricas de toxicidade (CTCAE), linha do tempo e exames. |
| **Gestão de Agenda** | Sincronização de recursos hospitalares e infusões. |
| **Central de Mensagens** | Workspace para chat direto com pacientes, integrando histórico de mensagens e anexos. |

---

## 🏗️ 2. Arquitetura do Sistema

O dashboard opera como um cliente de alta fidelidade que se comunica com dois serviços principais:

- **Supabase**: Fonte da verdade para dados clínicos (via RLS), autenticação de staff e atualizações em tempo real (fila de triagem).
- **Backend Node/Express**: Orquestrador de tarefas "pesadas" (OCR de exames, IA generativa, armazenamento Cloudflare R2).

---

## 🧱 3. Camadas Lógicas

| Camada | Tecnologia / Padrão |
|--------|----------------------|
| **Roteamento** | Next.js App Router (File-based) |
| **Estado Global** | Context API (`OncoCareContext`) + TanStack Query |
| **Componentes UI** | Tailwind CSS + Radix UI + Lucide Icons |
| **Realtime** | Supabase Postgres Changes (Realtime) para a fila |
| **Lazy Loading** | `next/dynamic` para abas pesadas do dossiê |

---

## 🔄 4. Fluxos Principais

### Fluxo de Triagem (Workspace)
1. O staff entra em `/inicio`.
2. O `TriageWorkspaceLayout` subscreve à tabela `patient_hospital_links` via Supabase Realtime.
3. Alertas de "Febre" ou "Nadir" fazem os cartões de paciente pulsarem na fila.
4. Ao selecionar um paciente, a URL muda para `/inicio/[patientId]`, abrindo o `PatientDossierPage`.

### Otimização 1366x768 (Solo Mode)
Para resoluções menores, o sistema entra em **Modo Solo**: ao abrir um dossiê, a fila lateral é ocultada para priorizar a área clínica, com um botão "Voltar para a fila" visível no topo.

---

## 📂 5. Estrutura do Projeto

```text
src/
├── app/                  # Rotas Next.js (App Router)
│   ├── (shell)/          # Layouts com sidebar/header
│   │   ├── inicio/       # Workspace de triagem e dossiê (Antigo /paciente)
│   │   └── pacientes/    # Listagem geral e gestão
├── components/           # Componentes atómicos e moleculares
│   ├── oncocare/         # UI específica do domínio hospitalar
│   ├── patient/          # Componentes do dossiê e abas
│   └── ui/               # Primitivas shadcn/ui
├── context/              # Contextos React (Auth, OncoCare)
├── lib/                  # Utilitários, formatação, config supabase
├── types/                # Definições TypeScript
└── views/                # Layouts de página de alto nível
```

---

## 🛠️ 6. Stack Tecnológica

- **Framework**: Next.js 15.1.x
- **Linguagem**: TypeScript
- **Estilo**: Tailwind CSS (Mobile-First + Fluid Design via `clamp()`)
- **Base de Dados/Auth**: Supabase
- **Animações**: Framer Motion / CSS Transitions

---

## 📚 7. Bibliotecas e Dependências

- `lucide-react`: Iconografia.
- `recharts`: Gráficos de evolução de métricas.
- `framer-motion`: Transições suaves entre abas.
- `sonner`: Sistema de toasts e notificações.
- `date-fns`: Manipulação robusta de datas em PT-PT/BR.

---

## 🚀 8. Arranque e Configuração (Setup)

### Variáveis de Ambiente (`.env`)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:3001 # Backend API
```

### Instalação
```bash
npm install
npm run dev
```

---

## 🔒 9. Segurança e Compliance

- **RLS (Row Level Security)**: O dashboard só exibe pacientes cujos vínculos com o hospital logado estão aprovados.
- **Auditoria**: Todas as alterações via RPC no Supabase são registradas com o ID do staff.
- **SaMD (Software as a Medical Device)**: Interface segue princípios de segurança clínica, sem realizar diagnósticos autónomos.

---

## 🗺️ 10. Roadmap

- [x] Migração para Next.js 15.
- [x] Otimização para monitores 1366x768 (Vertical Responsiveness).
- [x] Renomeação da rota operacional para `/inicio`.
- [ ] Exportação de relatórios em padrão FHIR.
- [ ] Visualizador DICOM integrado.

---

## 📄 11. Licença

Propriedade privada e confidencial de **OncoCare / Aura Onco**. Todos os direitos reservados.

---
*Este README foi atualizado para refletir a nova arquitetura Next.js e as otimizações de fluxo operacional.*
