# Pitch deck — Aura Onco para operadoras (roteiro 10–15 slides)

**Público:** diretoria clínica, TI e compliance da cooperativa / operadora.  
**Formato sugerido:** exportar cada seção como um slide; **12 slides** abaixo (expansível até 15 com demos ou anexos).

---

### Slide 1 — Título

- **Aura Onco** — Plataforma de apoio à gestão do paciente oncológico entre consultas  
- Subtítulo: Redução de urgências evitáveis e maior visibilidade para a equipe de cuidados  
- Logotipo Aura Onco + espaço para white-label da cooperativa

---

### Slide 2 — Problema

- O **paciente** oncológico passa a maior parte do tempo **fora** do hospital ou ambulatório.  
- Sintomas leves (febre pós-quimio, náuseas, dor) **evoluem sem visibilidade** para a equipe.  
- Resultado: idas ao pronto-socorro, internações e custo elevado — muitas vezes **antecipáveis** com monitoramento estruturado.

---

### Slide 3 — Impacto para a operadora

- Aumento de sinistralidade em urgências e internações **oncológicas relacionáveis** a agravamento tardio.  
- Falta de dados longitudinais entre episódios (registros do paciente ainda **esparsos ou inconsistentes** entre um atendimento e outro).  
- Programas de promoção da saúde e gestão de **crônicos** (quadro ANS) exigem **adesão** e evidência de cuidado contínuo.

---

### Slide 4 — Solução Aura Onco

- **App do paciente:** diário de sintomas com suporte a escalas clínicas, sinais vitais, medicamentos e tratamento (ciclos, infusões), lembretes e calendário.  
- **Painel web da instituição:** triagem por risco, alertas críticos (ex.: janela de nadir + febre), histórico e auditoria com RLS.  
- **Relatórios** exportáveis para **compartilhamento** com a equipe (com consentimento explícito).

---

### Slide 5 — Diferencial: alertas acionáveis

- Regras **determinísticas** (ex.: febre após quimioterapia na janela de nadir) disparam **registro** e notificação controlada.  
- Webhook opcional com **HMAC** para integração com sistemas da operadora (sem expor texto livre sensível no payload de alerta).  
- Objetivo: **antecipar neutropenia febril** e outros eventos que, sem vigilância, levam a UTI/urgência.

---

### Slide 6 — Posicionamento regulatório (ANVISA)

- O produto é **ferramenta de apoio à gestão de saúde e bem-estar** do paciente e da equipe: **registro**, organização e alertas baseados em critérios configuráveis.  
- **Não** substitui parecer médico; **não** calcula dosagens de quimioterapia nem emite diagnóstico automático.  
- Enquadramento alinhado à distinção entre *software de gestão* e *dispositivo médico* sujeito a **registro** específico, conforme avaliação legal do caso concreto.

---

### Slide 7 — LGPD e governança de dados

- **Supabase (PostgreSQL)** com **Row Level Security** por paciente e por hospital.  
- Consentimentos **granulares** (analytics, pesquisa, compartilhamento com equipe de cuidados vinculada).  
- Trilhas de **auditoria** no painel institucional.  
- Em modelo B2B2C: operadora como **controladora** dos dados do beneficiário no âmbito do contrato; Aura Onco como **operadora** de dados — formalizável por DPA.

---

### Slide 8 — Arquitetura e segurança (resumo)

- Mobile **React Native (Expo)**, dashboard web, API **Node.js**, base **PostgreSQL**.  
- Trânsito: **TLS 1.2+**; em repouso: criptografia **gerenciada** pelo provedor cloud; segredos e chaves fora do repositório.  
- Roadmap enterprise: **OIDC/SSO** com IdP da operadora; **API HL7 FHIR** (facade) para interoperabilidade com prontuário/ERP.

---

### Slide 9 — Alinhamento ANS / gestão de risco

- Monitoramento contínuo, adesão a medicamentos e informação educativa apoiam **programas de promoção da saúde e prevenção de riscos** no âmbito das práticas da operadora.  
- Métricas possíveis: pacientes oncológicos **ativos**, taxa de uso do app, alertas críticos tratados, tendências de sintomas (agregadas e com base legal).

---

### Slide 10 — Modelo de negócio (exemplos)

- **PMPM** (per member per month): valor por beneficiário oncológico **ativo** na plataforma no mês.  
- **Fee mensal fixo** por cooperativa: licença do painel + volume de contas incluído.  
- Piloto regional: escopo, duração, KPIs (urgências evitáveis, utilização, satisfação).

---

### Slide 11 — Próximos passos

- Workshop técnico com TI: residência de dados, SSO, integrações.  
- Revisão jurídica: DPA, SLA, termos B2B2C.  
- Piloto com uma cooperativa ou unidade: go-live controlado e medição de ROI.

---

### Slide 12 — Contato / Q&A

- Resumo de valor: **menos urgências evitáveis**, **mais adesão e visibilidade**, **compliance by design**.  
- Perguntas.

---

*Nota interna:* Ajustar números de ROI ao contexto local usando [`matriz-roi.md`](matriz-roi.md).
