Orquestrador de Agentes e Fluxo de Decisão (Agentic AI)
Documento: agent.md
Versão: 1.0.0
Motor Cognitivo: Google Gemini (Function Calling / Tool Use)
Objetivo: Definir a arquitetura do "Agente Orquestrador" que gerencia as interações do paciente, aciona ferramentas de backend (banco de dados, notificações) e garante o cumprimento das restrições clínicas.
1. O Papel do Orquestrador
No ecossistema Onco, o Agente Orquestrador não é um mero gerador de texto. Ele opera sob o paradigma ReAct (Reason + Act):
Reason (Raciocina): Entende a intenção do paciente e o contexto clínico atual (ex: "O paciente está no Nadir do ciclo AC-T?").
Act (Age): Aciona funções estruturadas (Tools) no backend, como salvar um sintoma, disparar um alerta ou chamar um modelo de visão computacional.
Observe (Observa): Analisa o retorno do banco de dados e formula a resposta final segura para o usuário.
2. Injeção de Contexto (System Prompt Dinâmico)
Antes do Agente processar qualquer mensagem do paciente, o backend (Node.js/Python) monta um System Prompt dinâmico, buscando dados em tempo real no Supabase. O Agente "acorda" já sabendo quem é o paciente.
Exemplo de Contexto Injetado Ocultamente (RAG - Retrieval):
{
  "patient_profile": {
    "name": "João Silva",
    "cancer_type": "leukemia",
    "current_cycle": "Ciclo 2 - Dia 8",
    "is_in_nadir": true,
    "last_vitals": { "temperature": 36.8, "timestamp": "2 horas atrás" }
  },
  "agent_directives": "REF: docs/ai-behavior.md - REGRA ZERO: Não diagnosticar. Risco de neutropenia atual: ALTO."
}

3. Tool Registry (As "Mãos" do Agente)
Para que o Agente interaja com o sistema definido em supabase-schema.md, ele recebe acesso a ferramentas estritas via Gemini Function Calling. O modelo nunca executa SQL diretamente; ele pede ao backend para rodar funções predefinidas.
Tool 1: log_symptom
Gatilho: Quando o paciente relata como está se sentindo ("Estou com muita náusea hoje e vomitei").
Ação do Agente: Extrai os dados, categoriza a severidade e chama a função.
Payload Gerado pelo Agente:
{
  "category": "nausea_vomiting",
  "severity": "severe",
  "requires_action": true
}

Resultado: O backend salva no Supabase e a UI do paciente atualiza o gráfico de sintomas (usando a cor semantic.symptoms do styleguide.md).
Tool 2: trigger_emergency_protocol
Gatilho: Relato de sintomas críticos cruzados com a fase do tratamento (ex: Febre > 37.8°C durante o Nadir).
Ação do Agente: Interrompe a conversa normal e aciona imediatamente o protocolo hospitalar.
Resultado: Notifica cuidadores, aciona webhook para o dashboard do hospital e exibe Modal Vermelho (semantic.vitals) no app do paciente.
Tool 3: delegate_to_vision_agent
Gatilho: O usuário envia um anexo (foto ou PDF de exame).
Ação do Agente: O orquestrador (rodando Gemini Flash) reconhece que a tarefa exige OCR profundo e "terceiriza" a tarefa para o modelo especializado (Gemini Pro), conforme definido no ai-models-analysis.md.
4. Fluxograma de Decisão do Orquestrador (Routing)
O fluxo de processamento de uma requisição segue a seguinte árvore de decisão (Latência alvo: < 1.0s):
Input do Usuário: Recebe texto, voz ou imagem via App.
Camada de Segurança (Guardrails): Expressões regulares (Regex) e bloqueios rápidos para detectar intenção de autoextermínio ou emergência extrema antes mesmo de chamar a IA.
Classificação de Intenção (Gemini Flash):
É um relato de sintoma? -> Roda Tool log_symptom.
É uma dúvida médica complexa? -> Retorna resposta com Disclaimer ("Consulte seu médico").
É uma intercorrência externa (Gripe/COVID)? -> Roda Tool log_opportunistic_disease (Avisa hospital para suspender quimio).
É uma imagem/laudo? -> Transfere para Gemini Pro Vision.
Execução de Backend: O Supabase executa as rotinas. As políticas RLS (supabase-policies.md) garantem que o Agente só está alterando os dados do paciente autenticado no token JWT.
Output (Resposta): O Agente formata a resposta empática e devolve para o React Native renderizar.
5. Exemplo de Interação Orquestrada
Paciente (App): "Acordei suando muito, medi a temperatura e está 38.1°."
Orquestrador (Pensamento Interno Oculto):
Observation: Paciente relata febre de 38.1°C.
Context Check: O contexto injetado diz que cancer_type = leukemia e is_in_nadir = true.
Reasoning: Febre no Nadir para leucemia é uma emergência hematológica (Risco de Sepse). Preciso agir imediatamente. Não devo fazer perguntas adicionais, devo acionar o hospital.
Action: Call Function trigger_emergency_protocol(patient_id=uuid, reason="Febre de 38.1°C no Nadir").
Action: Call Function log_symptom(category="fever", severity="life_threatening", value=38.1).
Resposta do Orquestrador para o App (UI):
"João, devido à fase atual do seu tratamento, essa febre precisa de atenção médica imediata. Já notifiquei a equipe de enfermagem do hospital e seus familiares. Por favor, dirija-se ao pronto-socorro mais próximo agora."