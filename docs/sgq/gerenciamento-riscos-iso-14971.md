# Gerenciamento de riscos (alinhado à ISO 14971)

A ISO 14971 aplica-se ao **gerenciamento de riscos** de dispositivos médicos; para **software como produto de saúde**, o processo abaixo adapta as etapas ao ecossistema Aura Onco (app, dashboard, backend, Supabase).

## 1. Produto e uso pretendido (insumo do arquivo de riscos)

Documentar de forma estável (e revisar quando o produto mudar):

- **Utilizadores:** paciente, cuidador, profissionais de saúde autorizados.
- **Funções críticas para segurança:** registo de sintomas/sinais vitais, triagem por regras, alertas ao hospital, partilha de dados sob consentimento.
- **O que o sistema não deve fazer** (para evitar uso inadequado): ver secção 1 de [`../unimed-b2b/narrativa-regulatoria.md`](../unimed-b2b/narrativa-regulatoria.md).

## 2. Identificação de perigos (hazards)

Considerar, entre outros:

| Área | Exemplos de perigo |
|------|---------------------|
| **Dados** | Acesso indevido (vazamento horizontal), perda de integridade do diário clínico. |
| **Lógica de triagem / alertas** | Falso negativo (sintoma grave não destacado); falso positivo (fadiga clínica). |
| **Atualização de software** | Regressão que altere limiares, textos de segurança ou fluxos de escalação. |
| **Disponibilidade** | Indisponibilidade prolongada em situação aguda (limitações a documentar). |
| **IA** | Saída não validada, instruções contraditórias com política clínica (ver [`../diretrizes-corportamento.md`](../diretrizes-corportamento.md)). |

## 3. Sequência de análise (ciclo)

Para cada perigo identificado:

1. **Cenário** — Condições e causa razoável.
2. **Situação prejudicial** — Dano ao paciente ou titular de dados.
3. **Probabilidade (P)** e **gravidade (S)** — Escala definida pelo time (ex.: P1–P5, S1–S5) e **critérios fixados por escrito**.
4. **Controles** — Requisitos de desenho (ex.: RLS), testes automatizados, monitorização, UX de confirmação clínica.
5. **Risco residual** — Após controles; aceitável ou exigindo mais mitigação ou aviso ao utilizador.

## 4. Arquivo de riscos

- **Local:** manter uma tabela viva (Markdown no repositório interno, Notion, ou ferramenta de QMS). O repositório público/privado pode conter **versão resumida** ou referência ao ID externo.
- **Template:** [templates/registro-risco-TEMPLATE.md](templates/registro-risco-TEMPLATE.md).
- **Ligação com mudanças:** novas funcionalidades ou alterações em triagem/alertas devem **atualizar ou referenciar** o arquivo de riscos no PR ou issue de release.

## 5. Revisão periódica

- Após **incidentes** de segurança ou queixas clínicas relevantes.
- Após **alteração regulatória** ou de contrato (operadora, hospital).
- **Anualmente** como mínimo.

## 6. Rastreabilidade ISO 14971 ↔ implementação

| Artefato | Onde evidenciar |
|----------|------------------|
| Controles técnicos | Migrações RLS, testes `backend`, validações Zod, guardrails de IA. |
| Evidência de teste | CI em [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml), testes manuais documentados na release. |
| Comunicação de risco | Textos no app (emergência, limitações), políticas em `docs/`. |
