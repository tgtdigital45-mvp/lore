# Matriz de ROI (Return on Investment) — cenário ilustrativo

**Objetivo:** traduzir em linguagem financeira o valor da monitorização e dos alertas críticos (ex.: neutropenia febril, desidratação por toxidade digestiva) para a operadora.  
**Aviso:** Os valores abaixo são **premissas editáveis**; devem ser substituídos por dados da cooperativa, tabela ANS/ANS de sinistralidade ou estudos internos antes de apresentação formal.

---

## 1. Premissas (exemplo)

| Parâmetro | Valor ilustrativo | Fonte / nota |
|-----------|-------------------|--------------|
| Custo médio de uma internação oncológica evitável (urgência → internação) | R$ 25.000 – 45.000 | Ajustar por tabela de preços / leito |
| Pacientes oncológicos “alto risco” acompanhados pelo programa | 500 | Piloto regional |
| Taxa de eventos graves potencialmente interceptáveis (ex.: febre em nadir) sem monitorização | 2–4% / ano | Literatura / auditoria interna |
| Redução esperada de internações evitáveis com programa ativo | 30–50% | Hipótese conservadora pós-piloto |

---

## 2. Cálculo simplificado (ilustrativo)

Cenário **sem** programa (ordem de grandeza):

- Eventos alvo: 500 × 3% ≈ **15 internações/ano** (média).  
- Custo agregado: 15 × R$ 35.000 ≈ **R$ 525.000/ano** (ilustrativo).

Cenário **com** Aura Onco (redução 40% em internações evitáveis):

- Economia anual esperada: **≈ R$ 210.000** (ilustrativo), antes do custo do software.

Compare o custo anual do contrato (**PMPM** × beneficiários activos × 12 **ou** fee fixo) com este intervalo. Se o piloto demonstrar **apenas 4–5 internações evitadas no ano**, o payback pode cobrir o custo do SaaS em muitos cenários — **desde que** as premissas de custo e taxa de evento sejam validadas localmente.

---

## 3. Outros benefícios (não monetizados aqui)

- Redução de litígios e reclamações por falta de continuidade de cuidados.  
- Dados para programas de promoção da saúde e prevenção (âmbito ANS).  
- Satisfação do beneficiário e adesão ao tratamento oral / follow-up.

---

## 4. Métricas sugeridas para o piloto (KPI)

| KPI | Como medir |
|-----|------------|
| Utilização mensal activa | Sessões / utilizadores com registo |
| Alertas críticos gerados | Contagem por tipo (regra nadir + febre, etc.) |
| Tempo até contacto pela equipa | Se integrado a fila ou CRM |
| Urgências oncológicas (cohort) | Comparar antes/depois com igual janela |

Use estes números para **actualizar** o slide de modelo de negócio do [`pitch-deck.md`](pitch-deck.md).
