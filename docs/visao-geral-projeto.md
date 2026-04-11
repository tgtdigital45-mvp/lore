Visão Geral do Projeto: Onco - Um Dia de Cada Vez
Documento: project-overview.md
Versão: 1.0.0
Status: Arquitetura Base Definida
Classificação: Confidencial / Estratégico
1. Resumo Executivo
O Onco é uma plataforma de Saúde Digital (HealthTech) classificada como um Dispositivo Médico em Software (SaMD). Diferente dos rastreadores de sintomas convencionais, o Onco atua como um companheiro preditivo para pacientes oncológicos e um motor de eficiência operacional para hospitais e clínicas.
O aplicativo utiliza Inteligência Artificial Generativa (LLMs) e integrações passivas com wearables para traduzir a complexidade do tratamento em ações diárias simples (daí o lema: "Um Dia de Cada Vez"). Paralelamente, estrutura esses dados do mundo real (RWD) em painéis de triagem hospitalar, permitindo intervenções médicas precoces antes que um sintoma escale para uma internação emergencial.
2. Proposta de Valor (Modelo B2B2C)
A viabilidade financeira da plataforma baseia-se em resolver dores agudas de ambas as pontas do tratamento.
2.1. Para o Paciente e Cuidador (A Ponta B2C)
Redução da Carga Cognitiva: A IA traduz laudos médicos complexos para linguagem acessível.
Segurança Contínua: Alertas inteligentes identificam quando um sintoma é normal para o ciclo atual da quimioterapia ou quando exige ida ao pronto-socorro (ex: risco de neutropenia febril).
Fim do Viés de Memória: Geração de um "Dossiê Inter-Ciclos" em PDF que resume os últimos 21 dias para ser entregue ao médico na consulta.
2.2. Para o Hospital / Clínica (A Ponta B2B - Fonte de Receita)
Prevenção de Sinistralidade e UTI: Intervenção precoce em efeitos colaterais severos (ex: desidratação severa gerando insuficiência renal aguda) rastreados via app.
Otimização de Cadeiras de Infusão: Gestão inteligente de intercorrências (ex: paciente relata gripe via app, a clínica cancela a quimio antecipadamente e aloca outro paciente no horário).
Matchmaking de Clinical Trials: Identificação automatizada de pacientes elegíveis para pesquisas clínicas financiadas pela indústria farmacêutica, gerando uma nova e massiva linha de receita para o centro de pesquisa da clínica.
3. Pilares Funcionais do Ecossistema
IA Tradutora de Exames (OCR & NLP): O paciente fotografa exames de sangue ou biópsias. A IA extrai biomarcadores, plota gráficos de tendência evolutiva e explica o resultado de forma empática.
Integração com Wearables (Apple HealthKit): Coleta passiva de Variabilidade da Frequência Cardíaca (VFC), saturação de oxigênio (SpO2) e detecção de quedas.
Círculo de Cuidado Sincronizado: Módulo onde familiares dividem a logística de transporte e recebem alertas SOS imediatos caso os sinais vitais do paciente caiam.
Módulos Adaptativos por Câncer: A interface e os protocolos de alerta mudam dependendo do diagnóstico (ex: alertas de linfedema para câncer de mama; alertas urinários para próstata).
Dashboard Hospitalar de Triagem: Um painel web onde a equipe de enfermagem visualiza todos os pacientes do hospital ordenados por risco e gravidade sintomática em tempo real.
4. Topologia Técnica e Arquitetura
Para entregar uma experiência de nível "Apple Health" com segurança de dados bancária, a stack tecnológica escolhida foi:
Front-end Mobile (Paciente/Cuidador):
React Native (Expo Development Build, Nova Arquitetura Fabric ativada).
TypeScript em Strict Mode.
React Native Reanimated para visualização de dados e gráficos fluidos.
Backend & Banco de Dados (BaaS):
Supabase (PostgreSQL) como motor central.
Utilização extrema de Row Level Security (RLS) para isolamento absoluto de dados entre pacientes e hospitais.
Inteligência Artificial:
Google Gemini API atuando sob rigorosas "Guardrails Clínicas" (A IA não diagnostica, apenas consolida e extrai dados).
5. Compliance e Regulamentação
Como o Onco lida com Dados Pessoais Sensíveis de Saúde (PHI), a arquitetura foi desenhada Privacy-by-Design:
LGPD (Brasil) e HIPAA (EUA): Conformidade garantida via Supabase RLS e trilhas de auditoria (Logs de acesso) sempre que a equipe médica acessa o prontuário.
Criptografia: TLS em trânsito e criptografia AES-256 em repouso (Supabase Storage).
Termos de Consentimento Granulares: O paciente decide se seus dados anonimizados podem ser utilizados para pesquisas de RWD (Real World Data).
6. Métricas de Sucesso (KPIs da Plataforma)
Para validar o Product-Market Fit com os primeiros hospitais parceiros, acompanharemos:
Taxa de Retenção Semanal (W1 Retention): Frequência de preenchimento do diário de sintomas durante os ciclos ativos.
Redução de Atendimentos em Pronto-Socorro (ER Visits): Comparativo da taxa de internações não planejadas de pacientes usando o Onco vs. grupo controle do hospital.
Conversão de Clinical Trials: Porcentagem de pacientes identificados pela IA do Onco que foram efetivamente recrutados para ensaios clínicos do hospital.