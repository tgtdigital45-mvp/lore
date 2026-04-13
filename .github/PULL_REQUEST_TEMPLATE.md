## Descrição

<!-- O quê mudou e porquê (contexto de issue/ticket). -->

## Ligação e rastreabilidade

- [ ] Issue / requisito: <!-- # ou ID externo -->
- [ ] Impacto em **triagem, alertas, sintomas ou dados clínicos**: **Sim** / **Não**
  - Se **Sim**: indique revisão do [arquivo de riscos](docs/sgq/gerenciamento-riscos-iso-14971.md) ou novo registo em `docs/sgq/templates/registro-risco-TEMPLATE.md`

## Verificação

- [ ] CI verde (build / test / typecheck conforme pacote)
- [ ] Regressão considerada (áreas tocadas; especialmente fluxos de diário e alertas)
- [ ] Migrações de BD: plano de rollback ou nota de irreversibilidade

## Segurança e dados

- [ ] Sem segredos no diff
- [ ] Alterações de RLS/políticas: descritas e alinhadas a [`docs/politicas-compliance.md`](docs/politicas-compliance.md)

<!-- Opcional: screenshots para UI -->
