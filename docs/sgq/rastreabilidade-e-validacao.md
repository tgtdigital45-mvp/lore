# Rastreabilidade e validação

Objetivo: demonstrar **ligação** entre necessidade (requisito), implementação, verificação (teste) e **liberação** (release), como esperado em BPF e boas práticas de software de saúde.

## 1. Identificadores

| Tipo | Exemplo | Uso |
|------|---------|-----|
| Issue / ticket | `ONCO-123` | Requisito, bug, risco |
| Pull request | `PR #45` | Mudança de código revisada |
| Commit | hash Git | Histórico fino |
| Tag / versão | `mobile@2.1.0` | Pacote libertado |

## 2. Matriz de rastreabilidade (template)

Copiar para cada release ou épico relevante:

| ID requisito | Descrição curta | Módulo | PR / commits | Teste automatizado | Teste manual / UAT | Responsável aprovação |
|--------------|-----------------|--------|--------------|--------------------|--------------------|------------------------|
| ONCO-… | … | mobile / backend / … | #… | `npm run test` (ficheiro X) | checklist triagem | nome |

## 3. Validação vs verificação

- **Verificação** — “Construímos o produto certo?” → testes, CI, revisão de código.
- **Validação** — “Construímos o produto certo para o uso clínico pretendido?” → UAT com hospital piloto, revisão de cópias de segurança, confirmação com stakeholders clínicos (conforme disponibilidade).

Atividades de **validação** devem ficar **registadas** (ata, email, ferramenta de gestão), mesmo que resumidas.

## 4. Registo de release (mínimo)

Para cada deploy de produção significativo:

- **Versão** e componentes incluídos.
- **Lista de PRs / issues** encerradas.
- **Riscos atualizados** (sim/não; referência ao arquivo).
- **Testes** — CI verde; testes manuais críticos assinalados.
- **Rollback** — commit ou artefacto anterior recuperável.

## 5. Ferramentas

O GitHub fornece automaticamente ligação **PR ↔ issue** quando se usa palavras-chave (`Closes #123`). Recomenda-se **sempre** ligar PRs a issues para itens regulatórios ou de segurança.
