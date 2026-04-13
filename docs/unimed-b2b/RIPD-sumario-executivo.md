# Relatório de impacto à proteção de dados (RIPD) — Sumário executivo

**Produto:** Aura Onco (aplicação móvel, painel web institucional, APIs associadas)  
**Referência legal:** Lei nº 13.709/2018 (LGPD), arts. 5º, 6º, 7º, 11 e 16 (medidas de segurança).  
**Nota:** Este sumário deve ser validado pelo Encarregado de Proteção de Dados (DPO) e atualizado quando mudarem finalidades, fornecedores ou regiões de tratamento.

---

## 1. Descrição do tratamento

O tratamento cobre dados pessoais **sensíveis** de saúde (sintomas, medicamentos, exames, sinais vitais, mensagens de suporte) e dados de identificação do titular e profissionais. Os dados são introduzidos pelo paciente ou pela equipa autorizada, armazenados em base relacional com **controlo de acesso por linha (RLS)**, e acessíveis apenas conforme políticas de perfil (paciente, staff de hospital vinculado, administração).

Finalidades principais: (i) prestação do serviço de acompanhamento acordado; (ii) triagem e continuidade de cuidados com **consentimento** ou outra base legal aplicável; (iii) cumprimento de obrigações legais e defesa em processos; (iv) segurança da informação e auditoria.

---

## 2. Titulares, agentes e bases legais

| Papel | Quem | Observação em cenário B2B2C |
|-------|------|------------------------------|
| Titular | Beneficiário / paciente | Direitos do art. 18 LGPD; consentimentos granulares no app |
| Controladora | Operadora de saúde / cooperativa (contrato) | Define finalidades no contrato com beneficiários; pode ser co-responsável conforme arranjo |
| Operadora | Fornecedor da plataforma (Aura Onco) | Trata dados por ordem da controladora e conforme DPA |
| Encarregado | DPO designado | Canal para titulares e ANPD |

Bases legais típicas: **consentimento** para usos opcionais (ex.: analytics, investigação); **execução de contrato** ou **legítimo interesse** com teste de proporcionalidade onde aplicável; **cumprimento de obrigação legal** para registos obrigatórios **hipotéticos** (validar por área jurídica).

---

## 3. Riscos e medidas

**Riscos identificados (exemplos):** acesso não autorizado, vazamento por credencial, exportação indevida, hipótese de decisão unicamente automatizada sem supervisão (mitigado por regras configuráveis e registo humano).

**Medidas em vigor no desenho actual:** RLS no PostgreSQL; autenticação forte; HTTPS; auditoria de acesso no painel; minimização em webhooks de alerta; segregação de ambientes; políticas de retenção a documentar por contrato.

**Medidas complementares recomendadas:** avaliação de impacto quando houver transferência internacional (LLM, CDN), inventário actualizado de subprocessadores, rotina de resposta a incidentes e DPIA reforçada para novas funcionalidades (FHIR, SSO em larga escala).

---

## 4. Transferências e subprocessadores

O tratamento pode envolver **serviços cloud** (base de dados, auth, armazenamento de objectos), **APIs de IA** (OCR / processamento de mensagens) e **mensagens** (WhatsApp). Cada um deve constar contratualmente com cláusulas de tratamento, localização geográfica e garantias (arts. 33–36 LGPD quando aplicável). Lista actual: ver [`due-diligence-tecnica.md`](due-diligence-tecnica.md).

---

## 5. Conclusão

O produto foi desenhado com **privacy by design** no controlo de acesso aos dados sensíveis. A concretização em contratos B2B exige **DPA**, registo de operações de tratamento actualizado e **RIPD** integral (não apenas este sumário) para operações de risco elevado, nos termos da regulamentação da ANPD.

*Documento preparatório para negociação enterprise — não substitui parecer jurídico.*
