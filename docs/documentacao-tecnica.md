Documentação Técnica e de Produto: Ecossistema "Onco: Um Dia de Cada Vez"
Versão: 1.4.0 | Status: Arquitetura Inicial | Classificação: Confidencial
1. Visão Geral do Produto
O Onco não é um mero rastreador de sintomas; é um companheiro de jornada preditivo e inteligente. O objetivo é reduzir a ansiedade do paciente, diminuir a sobrecarga cognitiva do cuidador e fornecer dados acionáveis em tempo real (RWD - Real World Data) para as equipes de oncologia dos hospitais, reduzindo internações emergenciais evitáveis e otimizando a operação clínica.
2. Brand Guide & Design System (Inspirado no Apple Health)
A interface deve ser uma réplica conceitual e visual do aplicativo Saúde (Apple Health). O design precisa ser clínico, porém altamente elegante, focando na clareza absoluta dos dados sem sobrecarregar o usuário.
2.1. Paleta de Cores (Alto Contraste e Clean)
O aplicativo não possui uma "cor de marca" dominante no fundo. O fundo é neutro e as cores são usadas exclusivamente para dar vida aos dados e módulos.
Cores de Base e Fundo (Neutras):
Primary Background: #FFFFFF (Light Mode) / #000000 (Dark Mode). O fundo principal é puro.
Card Background (Secondary): #F2F2F7 (Light Mode) / #1C1C1E (Dark Mode). Usado nos módulos arredondados para criar profundidade.
Typography: Preto primário (#000000) para títulos e Cinza secundário (#8E8E93) para legendas e descrições.
Cores Semânticas de Dados (Vibrantes - Padrão Apple):
Vermelho/Rosa (ex: #FF2D55): Sinais Vitais Críticos (Frequência Cardíaca, Alertas de Febre).
Azul Ciano (ex: #32ADE6): Sistema Respiratório (SpO2) e Diário de Hidratação.
Verde Maçã (ex: #34C759): Metas Concluídas, Preabilitação (Exercícios) e Nutrição.
Roxo/Índigo (ex: #5E5CE6): Medicamentos, Ciclos de Quimioterapia e Notificações do Círculo de Cuidado.
Laranja (ex: #FF9500): Sintomas reportados (Fadiga, Náusea) e Alertas de Atenção.
2.2. Tipografia
O padrão deve seguir a clareza e legibilidade máxima da Apple.
Fonte Principal: SF Pro Display (Títulos) e SF Pro Text (Corpo) para iOS. Inter para Android (configurada para simular as métricas da SF Pro).
Hierarquia: * Uso de Large Titles (Títulos Grandes e muito em negrito) no topo das telas (ex: "Resumo de Hoje").
Números de dados (ex: "37.5°") devem usar o peso Heavy ou Semibold e tamanho massivo, acompanhados da unidade médica ("°C") em texto pequeno ao lado.
2.3. UI/UX Principles e Gráficos
Modularidade (Cards): Todas as informações ("Sintomas", "Exames", "Hidratação") ficam dentro de cards com cantos perfeitamente arredondados (border-radius alto, padrão iOS 16+).
Gráficos Fluidos (Data Visualization): * Os gráficos não podem ser estáticos. Devem ser interativos: ao deslizar o dedo sobre a linha de tendência, uma bolha (tooltip) deve mostrar o valor exato do dia.
Gráficos de barra devem ter as pontas arredondadas (rounded caps).
Gráficos de linha devem ter gradientes de cor preenchendo a área inferior (fading gradient).
Espaço em Branco (White Space): Uso massivo de margens amplas para garantir que cada métrica "respire", reduzindo o peso cognitivo do paciente.
3. A Inteligência Clínica: O Diferencial Adaptativo
O maior diferencial do aplicativo é a Adaptação Contextual. O app muda sua interface, alertas e perguntas diárias com base no diagnóstico específico e no ciclo atual.
3.1. Módulos Adaptativos por Tipo de Câncer
Câncer de Mama: Foco em terapias hormonais (ondas de calor) e linfedema.
Câncer de Pulmão: Monitoramento respiratório (SpO2 via Apple Watch).
Câncer de Próstata: Sintomas do trato urinário e fadiga por privação androgênica.
Cânceres Hematológicos: Risco altíssimo de infecção (febre de 37.8°C é alerta vermelho imediato).
Cânceres Gastrointestinais: Desnutrição severa e neuropatia periférica.
3.2. Módulo de Tratamento e Ciclos
Nadir Tracker: Previsão dos dias de imunidade mais baixa (Atenção Redobrada).
Categorias de Medicação: Rastreamento de infusões, lesões por radioterapia e reações imunes.
3.3. Módulo Nutricional Integrado
Diário de Hidratação Dinâmico: Meta de água muda nos dias de infusão.
Gestão de Paladar (Disgeusia): IA sugere receitas baseadas em alterações de paladar (ex: gosto metálico).
Dieta Neutropênica: Avisos automáticos de segurança alimentar no período de Nadir.
3.4. Gestão de Intercorrências (Doenças Oportunistas)
Botão Rápido "Fiquei Doente": Para reportar resfriados, dengue, COVID-19.
Smart Alert de Risco de Suspensão: IA avisa se sintomas podem impedir a próxima quimio.
Integração de Agendamento (Hospital): Notifica a clínica para desmarcar sessão e liberar a cadeira, evitando viagens inúteis do paciente doente.
4. Arquitetura de Features (O "App dos Sonhos")
Feature 1: Tradutor de Exames com IA Generativa
A IA extrai os dados via OCR de laudos, estrutura biomarcadores e cria um resumo em linguagem simples com gráficos de evolução.
Feature 2: Integração de Wearables (Apple Watch / HealthKit)
Monitoramento de VFC (estresse/dor), detecção de quedas e SpO2 em background.
Feature 3: O Círculo de Cuidado (Modo Cuidador)
Logística compartilhada e Botão SOS invisível para acionar a rede e o hospital em emergências.
Feature 4: O "Hospital Dashboard" (B2B)
Triagem inteligente por algoritmo de cores para intervenção precoce via telemedicina.
Feature 5: Relatório Inter-Ciclos (O "Dossiê do Paciente") - NOVO
Resolve o problema do "Viés de Memória" (Recall Bias) durante as consultas.
Ação do Paciente: Com um toque, o paciente gera um relatório consolidado dos últimos X dias (ex: intervalo de 14 ou 21 dias entre quimioterapias).
Conteúdo do Relatório:
Mapa de Calor (Heatmap) de toxicidade: dias em que a fadiga ou náusea atingiram graus severos.
Picos de sinais vitais críticos (ex: maior temperatura registrada).
Intercorrências reportadas (ex: "Dia 8: Relatou resfriado comum").
Formatos de Exportação: * PDF Otimizado para Leitura Médica: Layout limpo e objetivo para o médico ler em 30 segundos. Pode ser compartilhado via WhatsApp, E-mail ou impresso.
Integração Hospitalar (HL7/FHIR): Se o hospital for parceiro, o relatório é enviado diretamente para o Prontuário Eletrônico (EHR) do paciente antes mesmo de ele chegar na recepção.
5. Módulos de Alto Valor Agregado (Ganha-Ganha B2B2C)
5.1. Concierge de Burocracia e Guias (Patient Navigation)
Para o Paciente: Fotografa o pedido médico. IA analisa códigos TUSS/CID e envia para auditoria. Mostra uma "barra de progresso" estilo delivery.
Para o Hospital: Reduz em 40% ligações sobre aprovações. Evita adiamento de sessões, mantendo o faturamento previsível.
5.2. Matchmaking de Pesquisa Clínica (Clinical Trials)
Para o Paciente: App cruza biomarcadores com pesquisas abertas e oferece convites para novos tratamentos.
Para o Hospital: Resolve o recrutamento. O app faz a triagem automatizada, gerando receita massiva para o centro de pesquisa.
5.3. Preabilitação Digital (O "Pré-Treino" Oncológico)
Para o Paciente: Cronograma de exercícios e metas de proteína antes de cirurgia/quimio.
Para o Hospital: Pacientes preabilitados reduzem complicações e tempo de UTI, diminuindo custos operacionais.
5.4. Plano de Sobrevivência (Survivorship Care)
Para o Paciente: Transição para modo "Manutenção" após remissão, agendando rastreios anuais e hábitos de saúde (combate ao medo da recidiva).
Para o Hospital: Garante a retenção do paciente (Lifetime Value), mantendo-o no ecossistema da instituição.
6. Requisitos Técnicos e Stack
Front-end: React Native (Expo Development Build, Fabric). TypeScript strict mode. TanStack Query.
Visual Data: Recharts ou bibliotecas baseadas em D3/Reanimated para gráficos no padrão Apple.
Geração de PDF: Biblioteca expo-print para desenhar o relatório em HTML nativo e exportar em PDF no device.
Back-end: Microserviços (Node.js/Python). PostgreSQL + MongoDB. API do Google Gemini.
Segurança: E2EE, LGPD, HIPAA.