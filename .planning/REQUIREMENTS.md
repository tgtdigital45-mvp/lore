# Requirements: Aura Onco

**Defined:** 2026-04-20  
**Core Value:** Dossiê clínico do dia a dia completo e consentido, com dados protegidos por RLS e integrações auditáveis.

## v1 Requirements

Escopo GSD inicial: **endurecimento e evolução** do produto existente (não greenfield). Cada requisito é verificável.

**Ordem de execução acordada:** começar por dashboard, dados/qualidade, mobile e documentação; **API/webhooks escaláveis por último** (fase futura próxima).

### Dashboard hospitalar

- [ ] **DASH-01**: Plano de remoção ou arquivo de `PatientModal` deprecated sem regressão em rotas — ver `hospital-dashboard/src/components/patient/PatientModal.tsx`.
- [ ] **DASH-02**: Dossiê / triagem mantêm fluxo único documentado para novos contribuidores (`PatientDossierPage` vs modal legado).

### Dados & segurança

- [ ] **DATA-01**: Pelo menos um teste integrado ou script verificável que exercite políticas RLS críticas (smoke), alinhado a `supabase/migrations/`.

### Mobile

- [ ] **MOBL-01**: Deep linking documentado para o fluxo principal (login → home ou convite), mesmo que implementação seja faseada.
- [ ] **MOBL-02**: Lista de gaps a11y priorizados (WCAG alvo) com dono de ficheiro/écran.

### Qualidade & operações

- [ ] **QUAL-01**: Suite E2E Maestro (`.maestro/`) a correr em CI ou documentação explícita de gate manual antes de release.
- [ ] **QUAL-02**: Cobertura mínima acordada para novos handlers Express críticos (ex.: OCR, rotas de exames); alinhar com a fase API quando esta arrancar.

### Documentação

- [ ] **DOCS-01**: `docs/RELATORIO-PROJETO.md` ou `README.md` referenciam `.planning/` e o fluxo GSD para onboarding.

### Backend & integrações *(última fase — feature futura próxima)*

- [ ] **API-01**: Lookup de paciente por telefone em webhooks Evolution (ou equivalente) **sem** varrer milhares de linhas em memória de forma descontrolada — ver `backend/src/evolutionWebhook.ts`.
- [ ] **API-02**: Autenticação e validação de payloads nos webhooks (Meta / Evolution) documentada e consistente com `backend/src/config.ts`.
- [ ] **API-03**: Normalização de dígitos de telefone **única** partilhada entre `whatsappRoutes.ts` e `evolutionWebhook.ts`.

## v2 Requirements

- **MOBL-10**: Dark mode completo no mobile.
- **MOBL-11**: Onboarding guiado pós-login.
- **DASH-10**: Realtime filtrado por hospital (performance + privacidade operacional).
- **OPS-10**: Métricas agregadas para operadoras / RWE.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Motor de diagnóstico clínico automático | Fora do princípio de produto e compliance |
| Migração off Supabase para dados paciente | Quebraria RLS e modelo atual |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DASH-01 | Phase 1 | Pending |
| DASH-02 | Phase 1 | Pending |
| DATA-01 | Phase 2 | Pending |
| QUAL-01 | Phase 2 | Pending |
| QUAL-02 | Phase 2 | Pending |
| MOBL-01 | Phase 3 | Pending |
| MOBL-02 | Phase 3 | Pending |
| DOCS-01 | Phase 4 | Pending |
| API-01 | Phase 5 | Pending |
| API-02 | Phase 5 | Pending |
| API-03 | Phase 5 | Pending |

**Coverage:**

- v1 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-20*  
*Last updated: 2026-04-21 — prioridade: DASH → dados/qualidade → mobile → docs → API (futuro próximo)*
