# OncoCare — Testes E2E (Maestro)

**Sumário para a empresa:** esta pasta contém a **suite de testes de interface** da aplicação móvel OncoCare (Expo), escrita em **Maestro** (YAML). O objetivo é validar o **caminho crítico** do utilizador — login, resumo, saúde, medicamentos, tratamento, exames, diário, calendário e vitals — de forma repetível em CI ou manualmente em emulador/dispositivo.

---

## 1. Pré-requisitos

- [Maestro CLI](https://maestro.mobile.dev/) instalado.
- Build de desenvolvimento ou release da app com **`appId`** `com.auraonco.app` (ver `mobile/app.json`).
- Opcional: variáveis **`AURA_TEST_EMAIL`** e **`AURA_TEST_PASSWORD`** para login automatizado.

---

## 2. Execução

Na raiz do repositório:

```bash
maestro test .maestro/main.yaml
```

Fluxos individuais (exemplos):

```bash
maestro test .maestro/flows/login.yaml
maestro test .maestro/flows/home.yaml
```

O ficheiro **[`main.yaml`](main.yaml)** orquestra a ordem dos fluxos em `flows/`.

---

## 3. Estrutura

| Caminho | Função |
|---------|--------|
| `main.yaml` | Suite principal — sequência de `runFlow` |
| `flows/` | Fluxos reutilizáveis (`_do_login.yaml`, `calendar.yaml`, etc.) |
| `maestro/smoke.yaml` | Smoke rápido (ficheiro auxiliar na suite) |

---

## 4. Relação com o monorepo

- **App testado:** [`../mobile/`](../mobile/) — mesmo bundle ID e fluxos Expo Router.
- **Backend / Supabase:** os testes assumem ambiente acessível (URLs e credenciais de teste); não versionar secrets nos YAML.

---

*Documentação para QA, engenharia e preparação de releases com evidência de regressão em UI.*
