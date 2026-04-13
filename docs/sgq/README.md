# SGQ — Sistema de Gestão da Qualidade (Aura Onco)

Este diretório concentra os **processos documentados** exigidos para rastreabilidade em contexto de **Boas Práticas de Fabricação** (BPF) e produtos de saúde sob vigilância sanitária, em particular a [**RDC ANVISA nº 665/2022**](https://www.gov.br/anvisa/pt-br/assuntos/regulamentacao) (BPF de produtos para a saúde). Em TI clínica, isso traduz-se em: **riscos controlados**, **ciclo de vida de software disciplinado**, **cibersegurança** e **proteção de dados** com evidências auditáveis.

> **Nota de escopo:** Os documentos abaixo descrevem *como* o time governa o repositório e o produto. Não substituem parecer jurídico, registro de produto na ANVISA nem certificação de norma; servem de base para auditoria interna, due diligence e evolução regulatória (incl. eventual **SaMD**, conforme [`../unimed-b2b/narrativa-regulatoria.md`](../unimed-b2b/narrativa-regulatoria.md)).

---

## Mapa do SGQ

| Documento | Norma / foco | Conteúdo |
|-----------|----------------|----------|
| [politica-qualidade.md](politica-qualidade.md) | BPF / ISO 9001 (princípios) | Política, papéis, revisão documental |
| [gerenciamento-riscos-iso-14971.md](gerenciamento-riscos-iso-14971.md) | **ISO 14971** | Processo de risco, arquivo de riscos, aceitabilidade |
| [ciclo-vida-software-iec-62304.md](ciclo-vida-software-iec-62304.md) | **IEC 62304** | Desenvolvimento, testes, versões, mudanças, problemas |
| [ciberseguranca-lgpd.md](ciberseguranca-lgpd.md) | **LGPD** + segurança | Privacidade, incidentes, ligação a `SECURITY.md` |
| [rastreabilidade-e-validacao.md](rastreabilidade-e-validacao.md) | Rastreabilidade | Requisito → implementação → teste → release |

## Templates (preencher em repositório interno ou ferramenta)

| Arquivo | Uso |
|---------|-----|
| [templates/registro-risco-TEMPLATE.md](templates/registro-risco-TEMPLATE.md) | Linha de risco para o arquivo de riscos |

## Artefatos técnicos já no repositório

- **CI automatizado:** [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) (build/test por pacote).
- **Segurança operacional:** [`../SECURITY.md`](../SECURITY.md), [`../OPERATIONS.md`](../OPERATIONS.md).
- **Dados e acesso:** [`../politicas-compliance.md`](../politicas-compliance.md), RLS nas migrações `supabase/migrations/`.
- **Controle de mudanças em PR:** [`.github/PULL_REQUEST_TEMPLATE.md`](../../.github/PULL_REQUEST_TEMPLATE.md).

## Manutenção

O **responsável pela qualidade** (nomeado pelo gestor do produto) revisa este SGQ **pelo menos anualmente** ou após mudança relevante de finalidade clínica, arquitetura ou contrato B2B.
