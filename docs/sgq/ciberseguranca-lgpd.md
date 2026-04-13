# Cibersegurança e proteção de dados (LGPD)

Este documento integra o SGQ com as práticas já descritas no repositório. **Não duplica** o detalhe técnico — aponta para as fontes canónicas.

## 1. Princípios LGPD no produto

| Princípio | Implementação de referência |
|-----------|-----------------------------|
| Finalidade, necessidade, segurança | [`../politicas-compliance.md`](../politicas-compliance.md), consentimentos no app |
| Privacidade por desenho | RLS no PostgreSQL, políticas por papel |
| Transparência | Textos de consentimento, narrativa regulatória |
| Direitos do titular | Fluxos DPO / operadora (B2B2C em [`../unimed-b2b/narrativa-regulatoria.md`](../unimed-b2b/narrativa-regulatoria.md)) |

## 2. Cibersegurança operacional

| Tema | Documento / local |
|------|---------------------|
| Senhas, webhooks, CORS | [`../SECURITY.md`](../SECURITY.md) |
| Cron, Edge Functions, assinaturas | [`../OPERATIONS.md`](../OPERATIONS.md), `supabase/functions/README.md` |
| Segredos e CI | Variáveis no GitHub/Vercel/Supabase — nunca em Git |

## 3. Gestão de vulnerabilidades e dependências

- **Dependências:** revisar `npm audit` / alertas do GitHub Dependabot (se ativo) em ciclo regular.
- **Patches críticos:** prioridade alta; PR dedicado com descrição de impacto.

## 4. Registo e notificação de incidentes

1. **Deteção** — monitorização, reporte interno ou cliente.
2. **Contenção** — revogar chaves, desativar endpoint, isolar conta.
3. **Avaliação** — dados afetados, bases legais, necessidade de comunicação a titulares e ANPD (avaliar com **DPO/advogado**).
4. **Correção e lições aprendidas** — atualizar riscos ([gerenciamento-riscos-iso-14971.md](gerenciamento-riscos-iso-14971.md)) e, se aplicável, [`../SECURITY.md`](../SECURITY.md).

## 5. Fornecedores e suboperadores

Contratos B2B devem listar subprocessadores e fluxos internacionais quando existirem — ver [`../unimed-b2b/checklist-DPA-SLA.md`](../unimed-b2b/checklist-DPA-SLA.md).

## 6. Evidência para auditoria

Manter **registo datado** de: deploys relevantes, alterações de política RLS, incidentes (mesmo resumidos), e treinamento de acesso a dados de produção (quem, quando, finalidade).
