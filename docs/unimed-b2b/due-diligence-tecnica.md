# Due diligence técnica — residência de dados, FHIR, OIDC/SSO

Documento para equipa de TI e segurança da operadora. Deve ser **actualizado** quando mudarem regiões de deploy ou fornecedores.

---

## 1. Matriz de componentes e residência de dados

| Componente | Função | Localização típida (a confirmar no deploy) | Dados tocados | Notas |
|------------|--------|--------------------------------------------|---------------|-------|
| Supabase — PostgreSQL | Base principal, RLS | Região do **project** (preferir `sa-east-1` ou equivalente Brasil se disponível no plano) | PHI completo | Confirmar no dashboard Supabase |
| Supabase — Auth | Utilizadores e JWT | Mesma região do project | Identificadores, email, metadata | |
| Supabase — Storage | Ficheiros (se usado) | Região do bucket | Imagens/PDF | Alternativa: R2 abaixo |
| Cloudflare R2 | Object storage (exames) | Região configurada na criação do bucket | Blob de exames | Ver política da Cloudflare |
| Backend Node (Express) | API, OCR, webhooks | Onde estiver hospedado (VPS, Fly, Render, etc.) | Trânsito temporário | Stateless preferível |
| Google Gemini | OCR / LLM agente | EUA ou multirregião (conforme Google) | Imagens e texto em trânsito | Transferência internacional — declarar no DPA/RIPD |
| OpenAI | Fallback OCR / suporte | EUA ou região escolhida | Idem | Idem |
| Expo push | Notificações | Infra Expo | Tokens de dispositivo | |
| Meta WhatsApp Cloud API | Mensagens | Infra Meta | Metadados e conteúdo de mensagens | |
| Landing / dashboard estáticos | Front-end | CDN do host | Sem PHI por defeito | |

**Acção:** Preencher a coluna “Localização típica” com valores reais do ambiente de **produção** antes da auditoria.

---

## 2. Epic OIDC / SSO (Supabase Auth)

**Objectivo:** o beneficiário inicia sessão no Aura Onco com as mesmas credenciais federadas da operadora (quando o IdP da operadora suportar OIDC).

### 2.1 Pré-requisitos do lado da operadora

- Documento de descoberta OIDC (`/.well-known/openid-configuration`) ou equivalente SAML se Supabase suportar via parceiro.  
- `client_id` / `client_secret` (Ou PKCE público conforme política).  
- URLs de redirect autorizadas (scheme do app Expo + deep links + URLs web do dashboard se aplicável).  
- Ambiente de **homologação** espelhando produção.

### 2.2 Passos técnicos (Supabase)

1. No Dashboard Supabase → **Authentication → Providers** → adicionar **OpenID Connect** (ou Apple/Google já existentes como complemento, não substituto institucional).  
2. Preencher issuer, client ID, secret ou fluxo PKCE.  
3. Mapear `sub` ou claim estável ao `auth.users` (linking account) — definir política de primeiro login vs migração de utilizadores existentes.  
4. No app Expo: usar `signInWithOAuth` / fluxo web com redirect compatível com Expo Router.  
5. Testar refresh token, logout e revogação.

Referência de config local: [`../../supabase/config.toml`](../../supabase/config.toml) (secção auth; comentários sobre OIDC).

### 2.3 Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Lock-in a um único IdP | Manter login email como canal de contingência (se operadora aceitar) |
| Mismatch de claims | Teste de integração no staging |
| Sessão partilhada com app institucional do beneficiário | Depende de mesmo IdP client — validar com o time da operadora |

*(Corrigir nome da app institucional conforme cooperativa real.)*

---

## 3. Plano FHIR façade (HL7 FHIR R4)

**Objectivo:** exposição de recursos FHIR para consumo pelo ERP/EHR ou gateway de interoperabilidade da operadora, sem substituir a API REST interna existente.

### 3.1 Fase A — Leitura (GET) mínima

Implementar atrás de **API key**, **mTLS** ou **OAuth client credentials** acordado com a operadora.

| Recurso | Interacções | Mapeamento conceptual |
|---------|-------------|------------------------|
| `Patient` | GET por ID / search identifier | `patients` + identificador externo (CPF/hash, cartão) |
| `Observation` | GET, search patient + date | `symptom_logs`, `vital_logs`, biomarcadores como `Observation` com código LOINC onde aplicável |
| `DocumentReference` | GET | Relatórios PDF armazenados com metadados |

### 3.2 Fase B — Escrita / notificação

- `Subscription` (se suportado) ou polling pela operadora.  
- Ou continuação do modelo actual de **webhook HMAC** para alertas críticos até alinhamento FHIR completo.

### 3.3 Conformidade

- Validar JSON contra **FHIR R4** base specification.  
- Se a operadora exigir **Nacionalização BR**: alinhar a perfis e terminologias quando publicados e testados (TIMS, etc.).

### 3.4 Esforço estimado (ordem de grandeza)

- MVP leitura Patient + Observation: **2–4 sprints** com 1 backend dev (mapeamento, auth de serviço, testes).  
- Integração certificada em ambiente da operadora: depende da disponibilidade do **sandbox** deles.

---

## 4. Monitorização para SLA

- Healthcheck do backend (`/health` ou equivalente).  
- Status do Supabase (página de status oficial).  
- Alertas de erro 5xx e latência p99.

Documentar valores reais no [`checklist-DPA-SLA.md`](checklist-DPA-SLA.md).

---

## 5. Ligações

- Arquitectura detalhada: [`arquitetura-enterprise.md`](arquitetura-enterprise.md)  
- RIPD sumário: [`RIPD-sumario-executivo.md`](RIPD-sumario-executivo.md)
