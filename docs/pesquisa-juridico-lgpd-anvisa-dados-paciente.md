# Dados de paciente, pesquisa e enquadramento jurídico-regulatório (Brasil)

**Objetivo:** apoiar **pesquisa jurídica e de compliance** sobre o que o ecossistema Aura-Onco **recolhe e trata** como dados de paciente, e **quais normas, documentação e órgãos** costumam entrar no escopo no Brasil — incluindo **ANVISA** quando o produto se enquadra como **software sujeito à vigilância sanitária**.

**Aviso importante:** este texto é **orientação geral e inventário técnico** baseado no **código e migrações do repositório**. **Não substitui** parecer de advogado, consultor regulatório (ANVISA) nem auditoria de privacidade. Crimes, litígios e decisões de registro devem ser tratados com **profissional habilitado**.

---

## 1. O que o produto recolhe e processa (inventário por domínio)

A lista abaixo reflete **tabelas e campos** previstos nas migrações Supabase e tipos do dashboard, até o estado atual do repositório. Alguns fluxos (OCR, WhatsApp, IA) envolvem **subprocessadores** e **dados sensíveis** (saúde).

### 1.1 Identidade, conta e contacto

| Origem / tabela | Dados típicos |
|-----------------|---------------|
| `auth.users` (Supabase Auth) | Credenciais de login (e-mail, etc., conforme configuração). |
| `profiles` | `full_name`, `date_of_birth`, `role`, `phone_e164`, `email_display`, `avatar_url`, `expo_push_token`, opt-in WhatsApp (`whatsapp_opt_in_at`, `whatsapp_opt_in_revoked_at`). |
| `patient_consents` | Consentimentos granulares: tratamento, analytics, pesquisa, partilha equipa, notificações; `policy_version`, `accepted_at`. |

### 1.2 Registo clínico principal (`patients`)

| Campo / grupo | Conteúdo |
|-----------------|----------|
| Identificação clínica | `primary_cancer_type`, `current_stage`, `care_phase`, `is_in_nadir`, `hospital_id`. |
| Código de ligação | `patient_code` (ex.: AURA-XXXXXX) onde existir na implementação. |
| Demografia / administrativo | `sex`, `blood_type`, `cpf`, `occupation`, `insurance_plan`, `address_city`, `address_state`. |
| Ficha médica | `is_pregnant`, `uses_continuous_medication`, `continuous_medication_notes`, `medical_history`, `allergies`, `height_cm`, `weight_kg`, `clinical_notes`. |
| `patient_emergency_contacts` | Contactos de emergência associados ao paciente. |

### 1.3 Tratamento e sintomas

| Tabela | Dados |
|--------|--------|
| `treatment_cycles` | Protocolo, datas, estado do ciclo; extensões (sessões/infusões conforme migrações). |
| `treatment_infusions` | Agendamento/detalhe de infusões ligadas ao tratamento. |
| `symptom_logs` | Categoria, gravidade, temperatura, notas, janelas temporais / verbal enum (evoluções do schema). |
| Estruturas CTCAE / episódios | `ctcae_terms`, `symptom_ae_responses`, `monitoring_episodes`, `risk_scores` (triagem e monitorização). |

### 1.4 Medicamentos e adesão

| Tabela | Dados |
|--------|--------|
| `medications`, `medication_schedules`, `medication_logs` | Nome, posologia, frequência, tomas, estados (tomado/ignorado/pendente). |
| `medication_reminder_dispatches`, `treatment_reminder_dispatches` | Registos de envio de lembretes. |

### 1.5 Sinais vitais, nutrição, wearables

| Tabela | Dados |
|--------|--------|
| `vital_logs` | Temperatura, FC, PA, SpO2, peso, glicemia, notas. |
| `nutrition_logs` | Água, refeições, calorias, macronutrientes, apetite, notas. |
| `health_wearable_samples` | Amostras de dispositivos vestíveis (quando integradas). |

### 1.6 Exames, biomarcadores e documentos

| Tabela | Dados |
|--------|--------|
| `biomarker_logs` | Séries laboratoriais, intervalos de referência, MIME, etc. |
| `medical_documents` | Metadados de ficheiros, tipo de documento, `ai_extracted_json` (extração/OCR), datas de exame. |
| Storage (ex.: buckets) | Ficheiros de exames, avatares, possivelmente áudio conforme PRD — políticas em migrações e backend. |

### 1.7 Ligação paciente–hospital, auditoria, mensagens

| Tabela | Dados |
|--------|--------|
| `patient_hospital_links`, `patient_hospital_link_events` | Estado da ligação, eventos (incl. código paciente). |
| `audit_logs` | Ações (ex.: visualização de prontuário), `actor_id`, `target_patient_id`, `metadata`. |
| `outbound_messages`, `whatsapp_inbound_messages` | Histórico de comunicações WhatsApp (conteúdo e metadados conforme implementação). |

### 1.8 Agenda, infusion, conteúdo educativo

| Tabela | Dados |
|--------|--------|
| `patient_appointments` | Consultas, lembretes, check-in (conforme migrações). |
| `infusion_resources`, `infusion_resource_bookings` | Postos/recursos e reservas (pode referenciar `patient_id`). |
| `educational_content`, `patient_content_views` | Conteúdos e consumo pelo paciente/cuidador. |
| `patient_caregivers`, `clinical_tasks` | Cuidadores e tarefas clínicas (DTx / fluxos estendidos). |

### 1.9 Evolução clínica estratégica (expansão)

| Tabela | Dados |
|--------|--------|
| `clinical_notes` | Notas por tipo (ex.: nutrição, enfermagem). |
| `clinical_timeline_events` | Marcos (diagnóstico, cirurgia, ciclo, imagiologia, lab crítico, etc.). |
| `tumor_evaluations` | Resposta tumoral (ex.: CR, PR, SD, PD). |
| `pro_questionnaire_responses` | Resultados de questionários PRO (Patient-Reported Outcomes). |

### 1.10 Regras de alerta e integrações

| Origem | Dados |
|--------|--------|
| `patient_alert_rules`, `patient_alert_events`, `protocol_*` | Regras personalizadas, janelas, medicamentos vigiados. |
| `hospitals` / `hospital_settings` | `alert_rules`, `integration_settings`, webhooks, exportação FHIR opcional. |
| Edge Functions / backend | Processamento de relatórios (ex.: `generate-evolution-report`), OCR, integrações — podem enviar dados a **fornecedores externos** (LLM, armazenamento). |

### 1.11 Resumo para classificação LGPD

Na prática, o sistema trata em conjunto:

- **Dados pessoais** (nome, contactos, localização aproximada, documentos).
- **Dados pessoais sensíveis** (saúde, biomarcadores, sintomas, medicamentos, gravidez, histórico clínico).
- **Registos de consentimento** e **trilhos de auditoria**.
- Possível **dados de pesquisa** se `consent_research` ou fluxos específicos forem usados para estudos — devem estar **alinhados a finalidade** e bases legais (ver secção 3).

---

## 2. ANVISA: quando pode ser necessário “aval” / regularização sanitária

A **ANVISA** regula **produtos sujeitos à vigilância sanitária**, entre eles **dispositivos médicos**. Para **software**, o marco relevante no Brasil inclui:

- **RDC nº 657/2022** — dispõe sobre **Software como Dispositivo Médico (SaMD)**.
- **RDC nº 751/2022** — classificação de risco (classes I a IV), **notificação** vs **registro**, requisitos gerais.
- Normas correlatas (ex.: **RDC 848/2024** — requisitos essenciais de segurança e desempenho; atualizações posteriores devem ser confirmadas no [portal da ANVISA](https://www.gov.br/anvisa)).

**Nem todo “app de saúde” é SaMD.** Em linha geral, a análise depende da **finalidade declarada** do software:

- Se o software **não** se destina a diagnóstico, tratamento, monitorização ou prevenção de doenças no sentido de produto sujeito à vigilância sanitária (definições legais e manuais da ANVISA), pode **não** haver obrigação de notificação/registo como dispositivo médico — ainda assim pode haver **outras obrigações** (LGPD, CFM, contratos hospitalares, etc.).
- Se o software **for** qualificado como **SaMD** (por exemplo, influencia decisão clínica de forma que se enquadre nas regras da ANVISA, incluindo a **Regra 11** para classificação de risco de software), o fabricante/importador costuma precisar de **notificação** (classes de risco mais baixas) ou **registo** (classes mais altas), com **documentação técnica** adequada (ciclo de vida de software, segurança, instruções de uso, rotulagem).

**Fatores que normalmente disparam análise jurídica-regulatória no seu caso:**

- Alertas automáticos que alteram conduta clínica; scores de risco; triagem que **substitui** ou **orienta** decisão médica.
- Uso de **IA** para interpretação de exames, dosagem ou diagnóstico.
- Integração com **prontuário** e **equipas clínicas** em ambiente hospitalar (B2B): contratos exigem **conformidade** e muitas vezes **lista de documentação** tipo dispositivo ou qualidade.

**Conclusão operativa:** tratar o enquadramento ANVISA como **pergunta obrigatória** na due diligence, com **parecer regulatório** (e não apenas “achismo” de produto). O **Manual de Regularização de Equipamento Médico e SaMD** (versões atualizadas na ANVISA) descreve fluxos de **notificação** e **registo**.

---

## 3. LGPD e autoridade de proteção de dados (não confundir com ANVISA)

- **Lei nº 13.709/2018 (LGPD)** aplica-se ao tratamento de dados pessoais no Brasil. Dados de saúde são, em regra, **sensíveis** — exigem **base legal** adequada e medidas de **segurança** e **governança**.
- A **ANPD** (Autoridade Nacional de Proteção de Dados) fiscaliza a LGPD; **não substitui** a ANVISA para produto sanitário.
- Documentação típica: políticas de privacidade, registos de atividades de tratamento, avaliação de impacto à proteção de dados (**RIPD** / DPIA) para tratamentos de alto risco, contratos com **operadores** (ex.: hospitais, cloud, Supabase, fornecedores de IA), **acordos de transferência internacional** se dados saírem do Brasil.

O repositório já prevê **`patient_consents`** com flags incluindo `consent_research` — isso **não dispensa** alinhamento legal da **finalidade** e, em pesquisa clínica/académica, pode exigir **ética em pesquisa** (ver abaixo).

---

## 4. Outras normas e âmbitos frequentes

| Âmbito | Exemplos do que costuma ser avaliado |
|--------|--------------------------------------|
| **Telemedicina e prática médica** | Resoluções do **CFM** e do **CRM** estadual sobre telemedicina, prescrição e prontuário eletrónico (números exatos devem ser checados na versão vigente). |
| **Enfermagem** | **COREN** quando enfermeiros registam ou validam dados clínicos. |
| **Pesquisa com seres humanos** | **CEP/CONEP** (ou processos equivalentes) se usar dados de saúde para **pesquisa** além da assistência; consentimento informado de pesquisa é **distinto** do consentimento assistencial/LGPD. |
| **Hospitais e contratos B2B** | Acordos de **subcontratação**, **SLA**, **localização de dados**, **resposta a incidentes**, **DPA** (Data Processing Agreement). |
| **Normas técnicas de software de saúde** | Referências internacionais frequentes em auditorias: **IEC 62304** (ciclo de vida de software médico), **ISO 14971** (gestão de riscos), **ISO 27001**/segurança da informação — úteis mesmo quando o enquadramento ANVISA ainda está em análise. |

---

## 5. Checklist de documentação (para conversar com advogado e regulatório)

1. **Mapa de dados (ROPA)** — origem, finalidade, base legal, retenção, quem acede (paciente, hospital, sistema).
2. **Política de privacidade** e **termos** atualizados à realidade do produto (app + dashboard + WhatsApp + IA).
3. **Consentimentos** por finalidade (tratamento, pesquisa, marketing, partilha com equipa) — alinhados ao que está em `patient_consents` e à prática real.
4. **RIPD/DPIA** para tratamentos de alto risco (dados de saúde em larga escala, perfis, scoring, IA).
5. **DPAs** com hospitais, cloud, messaging, OCR/IA.
6. **Registos de auditoria** e política de retenção (`audit_logs` e políticas internas).
7. **Enquadramento ANVISA** — parecer se o produto é ou não **SaMD**; se sim, classe de risco e via (**notificação** vs **registo**) e plano de **documentação técnica**.
8. **Pesquisa** — protocolo CEP/CONEP se aplicável; consentimento de pesquisa **separado** quando necessário.
9. **Segurança** — gestão de vulnerabilidades, backups, resposta a incidentes, **cibersegurança** (relevante também à RDC 848 e boas práticas de SaMD).

---

## 6. Referências oficiais sugeridas para aprofundar

- [ANVISA — produtos para a saúde, manuais e RDCs](https://www.gov.br/anvisa)
- [ANPD — LGPD e guias](https://www.gov.br/anpd)
- [Planalto — Lei 13.709/2018 (LGPD)](http://www.planalto.gov.br)

---

## 7. Evidência no repositório (para atualizar este documento)

| Artefato | Utilidade |
|----------|-----------|
| `supabase/migrations/*.sql` | Schema e comentários de colunas (ex.: LGPD em `patient_consents`). |
| `hospital-dashboard/src/types/dashboard.ts` | `PatientRow` e tipos expostos ao staff. |
| `docs/data-contract-dashboard.md` | Contrato de dados do dashboard hospitalar. |
| `docs/politicas-compliance.md` | Se existir, políticas internas do projeto. |
| `supabase/functions/` | Fluxos que enviam dados a serviços externos (IA, relatórios). |

**Manutenção:** quando novas tabelas ou campos forem adicionados, atualizar a secção 1 deste ficheiro para o inventário continuar a servir a **pesquisa jurídica** com fidelidade ao sistema.
