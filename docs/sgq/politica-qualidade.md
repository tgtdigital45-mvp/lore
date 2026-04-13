# Política da qualidade

## Objetivo

Garantir que o software e os serviços associados ao Aura Onco sejam **planejados, desenvolvidos, testados e operados** de forma **segura, rastreável e alinhada ao uso pretendido**, em conformidade com exigências de **BPF** (RDC 665/2022) aplicáveis ao contexto do fabricante/fornecedor e com a **LGPD**.

## Princípios

1. **Uso pretendido explícito** — Funcionalidades com impacto clínico ou de segurança do paciente são documentadas; alterações que se aproximem de diagnóstico ou decisão automática de tratamento exigem avaliação jurídica/regulatória prévia (ver narrativa em [`../unimed-b2b/narrativa-regulatoria.md`](../unimed-b2b/narrativa-regulatoria.md)).
2. **Rastreabilidade** — Requisitos, código, testes e releases ligados por identificadores (issues, PRs, tags Git).
3. **Gestão de riscos** — Riscos de software e de uso identificados, mitigados e revisados (ISO 14971 — ver [gerenciamento-riscos-iso-14971.md](gerenciamento-riscos-iso-14971.md)).
4. **Ciclo de vida controlado** — Mudanças passam por revisão, CI e critérios de liberação (IEC 62304 — ver [ciclo-vida-software-iec-62304.md](ciclo-vida-software-iec-62304.md)).
5. **Segurança e privacidade por desenho** — Mínimo privilégio, RLS, registo de incidentes (ver [ciberseguranca-lgpd.md](ciberseguranca-lgpd.md)).

## Papéis (mínimo)

| Papel | Responsabilidade no SGQ |
|-------|-------------------------|
| **Gestão do produto** | Prioriza backlog, aceita releases, aprova exceções documentadas. |
| **Qualidade / regulatório (designado)** | Mantém SGQ, coordena arquivo de riscos e revisões periódicas. |
| **Engenharia** | Implementa, testa, documenta PRs e registos de problema. |
| **Segurança / DPO (conforme empresa)** | Incidentes, DPIA/RIPD, contratos e suboperadores. |

## Revisão documental

- Documentos em `docs/sgq/` são versionados em Git; alterações relevantes seguem o mesmo fluxo de **pull request** que o código.
- **Frequência:** revisão anual do pacote SGQ ou após evento significativo (incidente grave, novo contrato hospitalar, mudança de finalidade).

## Referências cruzadas

- [README do SGQ](README.md)
- [Rastreabilidade e validação](rastreabilidade-e-validacao.md)
