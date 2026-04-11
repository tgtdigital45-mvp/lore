Product Requirements Document (PRD)Produto: Onco — um dia de cada vezPlataforma: Mobile (iOS e Android) | Futuro: Web Dashboard B2BEstágio: MVP (Minimum Viable Product)Data: Abril de 20261. Visão Executiva e Estratégia de ProdutoMissão: Reduzir a carga mental e física do tratamento oncológico, capacitando pacientes a retomarem o controle de sua rotina através de registros simplificados e dados acionáveis.O Problema: Pacientes em tratamento oncológico (quimioterapia, radioterapia, imunoterapia) enfrentam uma rotina exaustiva de medicamentos, oscilações severas de sintomas e múltiplas consultas. A dependência da memória falha (devido à fadiga ou chemo brain) resulta em relatos imprecisos aos oncologistas, prejudicando o ajuste do tratamento e o manejo da dor.A Solução ("Onco"): Um aplicativo móvel de uso diário, com interface de baixíssima fricção, que centraliza o diário de sintomas, gestão medicamentosa e cronograma de tratamento. O app atua como um "companheiro silencioso e eficiente", transformando dados subjetivos em relatórios objetivos.Visão de Futuro (B2B): O aplicativo servirá como interface de coleta de RWE (Real-World Evidence). No roadmap futuro, os dados (com consentimento) alimentarão um Dashboard Hospitalar, permitindo que a equipe de navegação oncológica realize triagem preditiva (ex: detectar neutropenia febril precocemente com base nos registros do paciente).2. Guia de Estilo e UX/Acessibilidade (UI Kit Base)Inspirado no Apple Health (iOS), o design system deve focar na acessibilidade extrema. Pacientes oncológicos podem apresentar neuropatia periférica (dificuldade motora fina) e fadiga visual.Padrão de Interface: Card-based UI. Cada métrica ou ação (Sintomas do dia, Próximo Remédio) vive em um cartão de fundo branco com cantos arredondados sobre um fundo cinza claro (#F2F2F7).Tipografia: San Francisco (iOS) e Roboto (Android). Uso extensivo de Dynamic Type (suporte a fontes grandes do sistema).Títulos: Bold, alto contraste.Corpo: Mínimo de 16pt, peso Regular ou Medium para maior legibilidade.Paleta de Cores (Cromoterapia Leve):Background Principal: Cinza off-white (#F2F2F7) para reduzir o brilho.Cards: Branco Puro (#FFFFFF).Ação Principal (Primary): Azul Sereno (#007AFF - padrão iOS) ou Verde Menta (associação com cura/saúde).Alertas (Sintomas Graves): Laranja Suave (#FF9500) ou Vermelho Tijolo (#FF3B30). Evitar vermelhos estridentes que causem ansiedade.Acessibilidade (A11y):Touch Targets: Áreas de toque mínimas de 44x44pt. Botões de ação principais devem ocupar toda a largura da tela (Full-width buttons).Escala de Dor/Humor: Substituir entrada de texto por Sliders táteis com haptic feedback (vibração leve) e emojis/ícones de fácil compreensão (FACES Pain Scale adaptada).Dark Mode: Suporte obrigatório para pacientes com fotofobia (comum pós-quimioterapia).3. User Stories (Escopo do MVP)Organizadas por épicos para facilitar a priorização no backlog ágil.Épico 1: Onboarding e Perfil ClínicoUS1.1: Como paciente, eu quero criar uma conta usando e-mail ou Apple/Google Sign-In para acessar o app rapidamente.US1.2: Como paciente, eu quero cadastrar meu diagnóstico (tipo de câncer e estadiamento) para personalizar meu perfil.US1.3: Como paciente, eu quero adicionar contatos do meu médico e de emergência, para que eu possa ligar para eles com um toque direto da tela inicial caso me sinta mal.Épico 2: Gestão de MedicamentosUS2.1: Como paciente, eu quero cadastrar meus medicamentos (nome, dosagem e frequência) para organizar minha rotina.US2.2: Como paciente, eu quero receber notificações Push no horário exato do remédio, para não esquecer a dose.US2.3: Como paciente, eu quero confirmar a ingestão do remédio clicando em um botão grande de "Tomado" no card da tela inicial, para não ter dúvidas se já tomei ou não.Épico 3: Diário de Sintomas (Symptom Tracker)US3.1: Como paciente, eu quero registrar meu nível de dor, náusea e fadiga usando uma escala visual (0 a 10), para que o processo leve menos de 10 segundos.US3.2: Como paciente, eu quero registrar meu humor diário e adicionar uma breve nota de voz ou texto, para documentar meu estado emocional.Épico 4: Tratamento e ConsultasUS4.1: Como paciente, eu quero visualizar um calendário com os dias do meu ciclo de quimioterapia/radioterapia, para saber em qual fase do tratamento estou.US4.2: Como paciente, eu quero agendar lembretes para minhas próximas consultas e exames de sangue.Épico 5: Relatórios ExportáveisUS5.1: Como paciente, eu quero gerar um relatório em PDF dos meus últimos 7, 15 ou 30 dias de sintomas e medicamentos, para enviar por WhatsApp ou e-mail ao meu oncologista antes da consulta.4. Fluxo de Usuário (User Flow Textual)4.1. Primeiro Acesso (Onboarding)Tela de Boas-vindas: Mensagem empática ("Estamos com você"). Opções de Login/Cadastro.Consentimento LGPD: Tela clara explicando que os dados são criptografados e opção granular de consentimento.Setup Clínico (Opcional no 1º passo): Seleção do tipo de câncer, estágio, nome do médico e telefone de emergência.Setup de Rotina: Adicionar o primeiro medicamento principal ou data do ciclo atual.4.2. Uso Diário (A Visão "Hoje")Home Screen (Dashboard do Paciente):Header: Saudação simples ("Bom dia, João") + Botão de Emergência fixo no topo direito.Card 1 (Ação Imediata): Próximo medicamento ("Ondansetrona, 8mg às 10:00") -> Botão [Marcar como Tomado].Card 2 (Diário): "Como você está se sentindo hoje?" -> Ícones rápidos de Humor/Dor.Card 3 (Próximo Evento): "Sessão de Quimioterapia em 2 dias".Registro de Sintoma (Fluxo Rápido):Clica no Card 2 -> Abre Modal de tela cheia.Desliza o Slider de Fadiga (0-10) -> Swipe para o lado.Desliza o Slider de Náusea (0-10) -> Swipe para o lado.Botão [Salvar Registro]. Retorna à Home com mensagem de sucesso.4.3. Consulta Médica (Exportação)Navega para a aba "Relatórios" (Menu inferior).Seleciona o período (ex: Últimos 15 dias).Visualiza um gráfico de linha resumido na tela (Tendência de dor vs. Náusea).Clica em [Exportar PDF].Abre a Share Sheet nativa do SO (iOS/Android) para enviar o arquivo gerado.5. Arquitetura Técnica e Decisões de EngenhariaA arquitetura foi pensada para alta disponibilidade, segurança de dados de saúde e escalabilidade para o futuro B2B (Dashboard Hospitalar).5.1. Stack TecnológicoFrontend Mobile: React Native (ou Expo). Permite código único para iOS e Android com performance quase nativa. O uso de Reanimated garantirá transições fluidas entre os cards.Backend & Banco de Dados: Supabase.Por que PostgreSQL (via Supabase) e não Mongo/Redis? Dados de saúde (EHR - Electronic Health Records) são altamente relacionais. Um paciente tem múltiplos ciclos, que têm sintomas diários. O PostgreSQL garante integridade referencial (ACID). Além disso, o Supabase possui o RLS (Row Level Security), que será crucial quando os hospitais precisarem acessar o DB: o RLS garantirá que o Médico A só acesse o Paciente X, diretamente na camada do banco.Autenticação: Supabase Auth (com suporte a MFA futuramente).Notificações & Cron Jobs: Edge Functions (Supabase/Deno) acionadas por gatilhos de banco (cron) para disparar Push Notifications (via Firebase Cloud Messaging/APNs) quando um horário de remédio se aproxima.Armazenamento de Arquivos: Supabase Storage (para PDFs gerados e futuros uploads de exames de sangue).5.2. Segurança e Compliance (LGPD / HIPAA)O nicho de HealthTech exige "Security by Design":Criptografia em Trânsito: Todo o tráfego deve ser forçado sobre TLS 1.3.Criptografia em Repouso: O Supabase, hospedado em infraestrutura AWS/GCP, criptografa volumes por padrão (AES-256).Dados Sensíveis (PII & PHI): Campos identificadores (Nome, CPF, E-mail) devem ser logicamente separados dos dados clínicos no banco.Minimização de Dados e Retenção: Implementar rotinas para exclusão de conta (Direito ao Esquecimento - Art. 18 LGPD). Ao deletar a conta, todos os registros em cascata (ON DELETE CASCADE) devem ser apagados.RLS (Row Level Security): Políticas estritas no PostgreSQL. Exemplo de regra: auth.uid() = patient_id. O usuário só pode fazer SELECT, UPDATE ou INSERT nas linhas que pertencem ao seu próprio ID.6. Estrutura de Dados (Schema PostgreSQL - Supabase)Abaixo, o modelo entidade-relacionamento simplificado e otimizado para o MVP, já prevendo a chave hospital_id para o futuro B2B.-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Perfil do Paciente (Estendendo a auth.users do Supabase)
CREATE TABLE patient_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    cancer_type VARCHAR(100), -- Ex: Câncer de Mama
    cancer_stage VARCHAR(50), -- Ex: Estágio III
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    hospital_id UUID NULL, -- PREPARAÇÃO PARA O FUTURO B2B
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Medicamentos e Prescrições
CREATE TABLE medications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    dosage VARCHAR(50), -- Ex: 8mg
    frequency_hours INT, -- Ex: 8 (de 8 em 8 horas)
    start_date DATE NOT NULL,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Histórico de Ingestão (Logs de Remédios)
CREATE TABLE medication_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    scheduled_time TIMESTAMPTZ NOT NULL,
    taken_time TIMESTAMPTZ, -- Se nulo, significa atrasado ou não tomado
    status VARCHAR(20) CHECK (status IN ('taken', 'skipped', 'pending')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Diário de Sintomas
CREATE TABLE symptom_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    pain_level INT CHECK (pain_level >= 0 AND pain_level <= 10),
    nausea_level INT CHECK (nausea_level >= 0 AND nausea_level <= 10),
    fatigue_level INT CHECK (fatigue_level >= 0 AND fatigue_level <= 10),
    mood VARCHAR(50), -- Ex: 'sad', 'neutral', 'happy'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Índice essencial para a geração rápida do relatório (filtrando por paciente e data)
CREATE INDEX idx_symptom_logs_patient_date ON symptom_logs(patient_id, log_date);

-- 5. Tratamentos e Ciclos
CREATE TABLE treatments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    treatment_type VARCHAR(50) CHECK (treatment_type IN ('chemotherapy', 'radiotherapy', 'immunotherapy', 'surgery')),
    cycle_number INT,
    start_date DATE,
    end_date DATE,
    hospital_name VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
6.1. Notas sobre as Políticas RLS (Segurança)Para garantir a LGPD logo no banco de dados, você implementará políticas no Supabase como esta para cada tabela:ALTER TABLE symptom_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pacientes veem apenas seus sintomas"
ON symptom_logs FOR SELECT
USING (auth.uid() = patient_id);

CREATE POLICY "Pacientes inserem seus próprios sintomas"
ON symptom_logs FOR INSERT
WITH CHECK (auth.uid() = patient_id);
Próximos Passos RecomendadosDesign: Iniciar o wireframing de alta fidelidade no Figma utilizando a diretriz de Cards com a paleta proposta.Validação: Rodar um teste de usabilidade (com protótipo clicável) com 3 a 5 pacientes reais ou cuidadores para validar a facilidade de uso dos sliders de dor.Engenharia: Configurar o projeto no Supabase, rodar o script SQL acima e iniciar a integração com o repositório React Native em ambiente de Staging.