# Template — Registro de risco (ISO 14971)

Copiar uma linha por risco para a tabela do arquivo mestre (ou preencher campos numa ferramenta de QMS).

| Campo | Descrição |
|-------|-----------|
| **ID** | RSK-YYYYMMDD-NN |
| **Data** | |
| **Título** | |
| **Produto / módulo** | ex.: mobile triagem, dashboard, backend alertas |
| **Perigo** | |
| **Cenário** | |
| **Situação prejudicial** | |
| **P** (prob.) | escala acordada pelo time |
| **S** (grav.) | escala acordada pelo time |
| **Controles (design)** | ex.: RLS, validação Zod, texto de emergência |
| **Controles (teste)** | ex.: teste unitário X, checklist manual Y |
| **Risco residual** | |
| **Aceitável?** | Sim / Não — se Não, plano adicional |
| **Referências** | issues, PRs, docs |
| **Revisão seguinte** | data |

---

## Critérios de escala (definir e colar na primeira página do arquivo)

**Probabilidade (P):**  
_(Exemplo — ajustar)_ P1 raro / P5 frequente.

**Gravidade (S):**  
_(Exemplo — ajustar)_ S1 leve / S5 morte ou dano irreversível.

**Zona aceitável:** apenas após aprovação escrita do processo de risco (tabela ou matriz P×S).
