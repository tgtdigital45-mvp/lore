# Ciclo de vida do software (alinhado à IEC 62304)

A [IEC 62304](https://www.iso.org/standard/72704.html) define requisitos para **processos de ciclo de vida** de **software de dispositivos médicos**. Mesmo quando o produto **não** está formalmente classificado como SaMD, adotar estas práticas reduz risco de regressão clínica e facilita auditoria.

## 1. Classificação de segurança do software (documento vivo)

O time deve **registar por escrito** a classe de segurança **pretendida** para cada item de configuração (ou para o sistema), com base no dano potencial de uma falha. A IEC 62304 usa classes **A, B, C** (de menor para maior rigor).

**Orientação para Aura Onco:** funcionalidades de **triagem, alertas e registo de sintomas** tendem a exigir rigor **B ou superior**, dependendo do uso pretendido e parecer regulatório.

> A classe influencia a profundidade de revisão de design e de testes — não precisa estar neste ficheiro; deve estar num **registo de planeamento** (wiki ou `docs/` interno) mantido pelo responsável de qualidade.

## 2. Atividades do ciclo de vida (resumo operacional)

| Atividade IEC 62304 | Prática no repositório |
|---------------------|-------------------------|
| **Planeamento de software** | Roadmap, issues, épicos; critérios de saída por sprint/release. |
| **Análise de requisitos** | User stories / PRD ([`../../prd-onco-app.md`](../../prd-onco-app.md)), contratos de dados ([`../data-contract-dashboard.md`](../data-contract-dashboard.md)). |
| **Arquitetura** | Diagramas no README, [`../arquitetura-bd.md`](../arquitetura-bd.md), ADRs opcionais em `docs/`. |
| **Implementação** | TypeScript estrito, revisão por PR, padrões existentes por pacote. |
| **Testes** | `npm run test` / `build` / `typecheck` no CI; testes manuais para fluxos críticos antes de produção. |
| **Gestão de configuração** | Git, tags de versão por app/pacote, branches protegidas (recomendado em GitHub). |
| **Resolução de problemas** | Issues com causa raiz; patches documentados; regressão coberta por teste quando possível. |
| **Manutenção e mudanças** | PR template com impacto clínico; changelog por release (ver secção 4). |

## 3. Versionamento e releases

- **Código:** commits atómicos; **PR** com descrição que liga a requisito/issue.
- **Versões:** usar **tags Git** semânticas por componente quando possível (`mobile@x.y.z`, etc.) ou registo centralizado em release notes.
- **Ambientes:** separar desenvolvimento / staging / produção; não promover build sem critérios acordados.

## 4. Regressão e “não ocultar sintoma grave”

Risco citado na prática de TI: **uma atualização não pode degradar a deteção ou evidenciação de sintomas graves.**

Processo mínimo:

1. **Testes de regressão** nas áreas tocadas pelo PR (automatizados onde existirem; manuais checklist para triagem/alertas).
2. **Diff visível** — alterações em limiares, cópias de segurança, fluxos de diário e integrações de alerta devem ser **explicitamente revistas** no PR (marcar no template).
3. **Dados históricos** — migrações não devem apagar ou corromper `symptom_logs` sem plano de backup e rollback documentado.

## 5. Integração com gestão de riscos (ISO 14971)

Alterações que afetem **segurança do paciente** ou **dados sensíveis** devem:

- Referenciar entrada no [arquivo de riscos](gerenciamento-riscos-iso-14971.md), ou
- Criar novo registo com [template](templates/registro-risco-TEMPLATE.md).

## 6. Referências

- CI: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
- Rastreabilidade: [rastreabilidade-e-validacao.md](rastreabilidade-e-validacao.md)
