# Backlog produto — priorização enterprise (operadoras / Unimed)

Ordem sugerida: **impacto contratual** × **esforço** × **dependências externas**.

---

## P0 — Bloqueadores típicos de contrato B2B

| Item | Descrição | Dependências |
|------|-----------|----------------|
| **SSO OIDC** | Login federado com IdP da operadora | Credenciais sandbox, redirect URLs, [`due-diligence-tecnica.md`](due-diligence-tecnica.md) §2 |
| **Matriz de residência + DPA** | Documentação e contratos assinados | Jurídico, preenchimento real da tabela em due diligence |
| **Uptime / suporte** | SLA comercial e monitorização alinhada a [`checklist-DPA-SLA.md`](checklist-DPA-SLA.md) | SRE, status page |

---

## P1 — Diferenciação e interoperabilidade

| Item | Descrição | Notas |
|------|-----------|-------|
| **FHIR façade R4** | GET `Patient`, `Observation`, `DocumentReference` mínimos | §3 em [`due-diligence-tecnica.md`](due-diligence-tecnica.md) |
| **White-label por tenant** | Cores, logótipo e nome da cooperativa carregados por `hospital` / tenant | Hoje existe `useAppTheme`; falta origem remota e cache |
| **Analytics populacional** | KPIs agregados: activos, adesão, alertas por período (sem expor PHI indevidamente) | Queries agregadas + permissões `hospital_admin` |

---

## P2 — Experiência clínica e educação

| Item | Descrição | Notas |
|------|-----------|-------|
| **EORTC QLQ-C30** | Questionário de qualidade de vida com scoring | **Licença EORTC** obrigatória; implementação digital + validação clínica |
| **Conteúdo psicoeducacional curado** | Biblioteca de artigos/vídeos aprovados pela operadora | Workflow editorial + possível CMS ou JSON versionado |
| **Mapeamento CTCAE explícito** | Onde fizer sentido, alinhar severidade a graus CTCAE | Evitar overclaim; validação clínica |

---

## P3 — Valor ANS / storytelling

| Item | Descrição |
|------|-----------|
| **Indicadores exportáveis** | CSV/PDF para programas de promoção da saúde (com base legal) |
| **Relatório de alertas críticos** | Por período, para revisão de auditoria médica |

---

## Itens fora do código (acompanhar em paralelo)

- Negociação de **PMPM** vs fee fixo e escopo de piloto ([`matriz-roi.md`](matriz-roi.md)).  
- **Treinamento** das equipas de enfermagem no dashboard.  
- **Conteúdo** médico validado unicamente pela cooperativa contratante quando exigido.

---

*Rever após cada release major ou alteração de fornecedor cloud.*
