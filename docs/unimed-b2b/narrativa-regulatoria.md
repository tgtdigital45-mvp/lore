# Narrativa regulatória consolidada — Aura Onco × operadoras (Unimed)

Documento interno para **alinhamento comercial e jurídico**. Não substitui parecer de advogado regulatório ou sanitário.

---

## 1. ANVISA — Não enquadrar como SaMD na comunicação externa (posicionamento)

**Mensagem-chave:** O Aura Onco apoia a **gestão da rotina** do paciente oncológico: registo de sintomas e sinais vitais, lembretes, calendário de tratamento, partilha opcional com a equipa de cuidados autorizada e alertas baseados em **regras configuráveis** e confirmação clínica.

**O que o produto não faz (para efeitos de classificação comunicacional):**

- Não define nem calcula **doses de quimioterapia** ou medicamentos citotóxicos.  
- Não substitui o **diagnóstico** nem a decisão terapêutica do médico assistente.  
- Não se apresenta como “diagnóstico por IA”; onde há processamento de linguagem ou OCR, o papel é **apoio à transcrição e organização** de informação, com limites de segurança no backend.

**Revisão obrigatória:** Qualquer alteração de funcionalidade que se aproxime de “software como dispositivo médico” (ex.: scores diagnósticos fechados sem validação clínica regulamentar) deve passar por **avaliação jurídica e, se aplicável, regulatória** antes do lançamento.

Referências de produto no código: guardrails do agente e README em [`../../README.md`](../../README.md).

---

## 2. LGPD — Papéis em B2B2C

| Situação | Controlador | Operador |
|----------|-------------|----------|
| Contrato típico cooperativa + SaaS | Operadora de saúde (define finalidades contratuais com o beneficiário e a política de saúde suplementar) | Fornecedor da plataforma (trata dados conforme instruções documentadas no contrato e DPA) |
| Titular | Paciente / beneficiário | — |

O encaminhamento de pedidos do titular (arts. 18 e 9º): canal DPO e fluxos descritos no site institucional; em B2B, coordenar com a operadora quando o contrato assim o exigir.

Base técnica: RLS, consentimentos em `patient_consents`, políticas em [`../politicas-compliance.md`](../politicas-compliance.md).

---

## 3. Opt-in B2B2C — Partilha com operadora e auditoria

O app já prevê **consentimento granular**, incluindo partilha com equipa de cuidados quando há vínculo institucional (`consent_share_care_team` em [`../../mobile/app/lgpd-consent.tsx`](../../mobile/app/lgpd-consent.tsx)).

Para contratos com **operadoras** tipo Unimed, a copy do utilizador deve deixar claro que, quando aplicável:

- Os dados autorizados podem ser visualizados por **profissionais e equipas de auditoria médica / gestão de crónicos** da instituição ou rede contratada, **no âmbito do vínculo** e da legislação aplicável.  
- O beneficiário pode **revogar** ou ajustar consentimentos quando a base legal permitir, sem prejudicar tratamentos cuja base não seja apenas consentimento.

**Ação:** revisão final de textos legais (Termos, Política de Privacidade) com escritório **antes** do go-live B2B2C com cooperativa.

---

## 4. ANS — Promoprev e IDSS (linguagem de valor, não de “certificação” em código)

O produto pode **contribuir** para iniciativas de promoção da saúde e prevenção de riscos ao apoiar adesão, registo longitudinal e educação — áreas frequentemente valorizadas em programas da operadora. **Não** existe no repositório um módulo que “marque pontos” automaticamente no IDSS; qualquer afirmação deve ser validada com o time de regulação da operadora e com a documentação ANS vigente.

---

## 5. DPA e SLA — Onde este documento termina

Requisitos contratuais típicos: cláusulas de confidencialidade, suboperadores, transferência internacional, notificação de incidente, localização de dados, auditoria anual, **SLA** de disponibilidade e suporte.

Lista de verificação para elaboração com advogado: [`checklist-DPA-SLA.md`](checklist-DPA-SLA.md).
