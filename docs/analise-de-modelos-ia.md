Análise de Modelos Fundacionais e Arquitetura de IA
Documento: ai-models-analysis.md
Versão: 1.0.0
Status: Decisão Arquitetural Aprovada
Classificação: Confidencial / Estratégico
1. Contexto e Requisitos do Sistema
O ecossistema Onco depende de Inteligência Artificial para duas cargas de trabalho (workloads) radicalmente diferentes:
Workload Leve (Alta Frequência / Baixa Latência): Triagem em tempo real de sintomas relatados em texto livre ou voz (Ex: "Estou com muita dor de cabeça e febre desde ontem"). Exige resposta em menos de 1 segundo para disparar gatilhos de segurança.
Workload Pesado (Multimodal / Raciocínio Profundo): Extração de dados via OCR (Reconhecimento Óptico de Caracteres) de fotos borradas ou PDFs de laudos de hemograma e biópsias com dezenas de páginas, estruturando-os em formato JSON.
2. Benchmark de Modelos do Mercado
Para atender aos requisitos acima, avaliamos os três principais provedores de modelos fundacionais (LLMs) considerando as necessidades específicas de HealthTech.
Critério / Modelo	Família GPT-4o (OpenAI)	Família Claude 3.5 (Anthropic)	Família Gemini 2.5 (Google)
Capacidade Multimodal (Visão)	Excelente (Nativa)	Muito Boa	Excepcional (Nativa de base)
Janela de Contexto	128k tokens	200k tokens	Até 2 Milhões de tokens
Latência (Modelos Leves)	~0.8s (GPT-4o mini)	~1.0s (Haiku)	~0.4s (Flash)
Geração de JSON Estruturado	Nativo (Strict)	Via Prompt	Nativo (Schema enforced)
Governança (HIPAA/BAA)	Sim (Azure / Enterprise)	Sim (AWS / Enterprise)	Sim (Google Cloud / Vertex AI)
Custo-Benefício em Escala	Alto	Médio-Alto	Otimizado (Tier Flash)
3. Decisão Arquitetural (ADR): A Escolha pelo Google Gemini
Com base na matriz acima, o ecossistema Onco adotará a arquitetura Google Gemini (Vertex AI) como motor principal. A justificativa técnica baseia-se em três pilares fundamentais:
3.1. Supremacia na Janela de Contexto (O "Prontuário Infinito")
O tratamento oncológico gera um volume massivo de documentos ao longo dos anos. A janela de contexto estendida do Gemini permite que, em versões futuras, o sistema processe o histórico completo do paciente (meses de diários de sintomas + dezenas de PDFs de exames) em um único prompt, sem perder o contexto cronológico ("agulha no palheiro").
3.2. Arquitetura de Roteamento Dinâmico (Router Model)
Para otimizar custos e performance, não usaremos um único modelo para tudo. Implementaremos um padrão de roteamento no backend:
Gemini Flash (Alta Velocidade / Baixo Custo): Será acionado 90% do tempo. Responsável por ler a string de sintoma inserida pelo paciente, rodar a análise de sentimento/risco e devolver um booleano de alerta amarelo/vermelho.
Gemini Pro (Raciocínio Complexo / Visão): Será acionado apenas quando o paciente fizer upload de um novo exame de sangue. Ele usará sua capacidade visual superior para ler tabelas tortas, interpretar biomarcadores complexos e devolver o JSON estruturado (ai_extracted_json).
3.3. Conformidade com HIPAA e LGPD
Ao utilizar o Gemini através da plataforma Google Cloud Vertex AI (e não as APIs públicas de consumidor), garantimos a assinatura do BAA (Business Associate Agreement).
Regra de Ouro: Os dados de saúde dos nossos pacientes (prompts, imagens de exames) não são utilizados pelo Google para treinar seus modelos fundacionais. O isolamento do tenant é garantido por contrato.
4. Engenharia de Prompts e Mitigação de Alucinações
Na área da saúde, uma alucinação de IA (inventar um dado) pode ser letal. Os seguintes parâmetros técnicos (Guardrails) são aplicados rigidamente no backend antes de qualquer requisição à API do Gemini:
Temperature (temperature = 0.0): Diferente de apps criativos, em OCR de exames a temperatura deve ser zero. O modelo deve ser determinístico e factual. Se o laudo diz "Leucócitos: 3000", ele não pode tentar "arredondar" ou interpretar.
System Instructions Restritivas: O system prompt global embute o comportamento restritivo: "Você é um assistente de extração de dados médicos. Você NÃO faz diagnósticos. Se a imagem estiver ilegível, retorne {"error": "unreadable_image"}."
Structured Outputs (JSON Schema): A API é forçada a retornar os dados em um esquema JSON estritamente tipado. Se a IA tentar devolver um texto solto, o backend rejeita a requisição, evitando a quebra do Front-end (React Native).
5. Roteiro de Atualizações Futuras
Fase 1 (Atual): Gemini Pro/Flash via Vertex AI.
Fase 2 (Exploratória): Fine-tuning (Ajuste Fino) de um modelo leve proprietário para detecção de anomalias apenas nos dados vitais em formato tabular, visando redução extrema de custos (Edge AI rodando diretamente no dispositivo do usuário).