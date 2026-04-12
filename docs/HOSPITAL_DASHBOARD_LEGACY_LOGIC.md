# Dashboard hospitalar legado — lógicas e funcionalidades (backlog)

Este documento regista o comportamento do painel hospitalar **antes** da reconstrução **OncoCare**, para reintrodução futura como funcionalidades adicionais. A lógica de dados em `hospital-dashboard/src/lib/` (triagem, risco de suspensão, nadir) **mantém-se** na base de código atual.

## Autenticação e perfil staff

- Login e cadastro via Supabase Auth (`signInWithPassword`, `signUp`).
- Perfil em `profiles` com `full_name` e `role` (médico, enfermeiro, gestão hospitalar).
- `ensureStaffIfPending` / `setPendingStaffRole` em [`hospital-dashboard/src/staffLink.ts`](../hospital-dashboard/src/staffLink.ts): após cadastro, vincula o utilizador ao hospital demo quando aplicável.

## Lotação e regras de alerta por hospital

- `staff_assignments` define os `hospital_id` visíveis ao utilizador.
- Regras hospitalares em `hospitals.alert_rules` são fundidas em [`mergeAlertRulesFromAssignments`](../hospital-dashboard/src/lib/triage.ts):
  - `fever_celsius_min`: **mínimo** entre hospitais (mais sensível).
  - `alert_window_hours`: **máximo** entre hospitais (janela mais larga).

## Triagem e lista de pacientes

- Pacientes: `patients` filtrados por `hospital_id` da lotação.
- `symptom_logs` carregados numa janela de tempo ≥ `max(168h, alert_window_hours)`.
- Gravidade por `SEVERITY_RANK` (mild → life_threatening) nos últimos 7 dias para ordenação.
- **Alerta clínico** (`patientClinicalAlert`): na janela configurável, dispara por gravidade `severe` / `life_threatening` ou febre em categoria `fever` com temperatura ≥ limiar.
- **Alerta 24h**: mesma lógica com janela fixa de 24 horas (`hasAlert24h`).
- **Ordenação**: primeiro pacientes com alerta clínico, depois maior risco, depois `is_in_nadir`.

## Tempo real e atualização periódica

- Canal Supabase Realtime em `symptom_logs` filtrado por `hospital_id` da lotação; ao receber INSERT/UPDATE, recarrega a triagem com debounce de **800ms**.
- Polling a cada **45s** quando o separador do browser está visível.

## KPIs do painel (métricas preservadas no OncoCare v1)

- **Total** de pacientes na lotação.
- **Alertas 24h**: contagem com `hasAlert24h`.
- **Risco alto/crítico**: pacientes com `risk >= 3` (severo ou ameaça à vida na escala agregada).
- **Em nadir**: `is_in_nadir === true`.

## Fila “precisa de atenção”

- Lista derivada: pacientes com alerta clínico **ou** `risk >= 3`, limitada a 8, coerente com filtros de pesquisa/cancro.

## Coorte (RPC)

- `staff_symptom_cohort_metrics(p_hospital_id, p_days)` com `p_days = 14` por defeito: sintomas agregados por dia (UTC) e contagem `requires_action`.

## Modal / dossiê do paciente

- Ao abrir paciente pela primeira vez na sessão: RPC `record_audit` com ação `VIEW_PATIENT`.
- Carregamento em paralelo: `treatment_cycles`, `symptom_logs`, `treatment_infusions`, `vital_logs`, `health_wearable_samples`, `medication_logs`, `nutrition_logs`.
- Aba **Exames**: `biomarker_logs`, `medical_documents` (sob demanda).
- Aba **Mensagens**: `outbound_messages`, opt-in WhatsApp via join em `patients.profiles`.
- Integração **onco-backend** (`VITE_BACKEND_URL`): OCR de exames (`/api/staff/ocr/analyze`), envio WhatsApp (`/api/whatsapp/send`), download/visualização de PDFs de exames.
- Em desenvolvimento, URL do backend podia ser sobrescrita via `sessionStorage` (`aura_hospital_backend_url`).

## Configurações do hospital (não expostas no OncoCare v1)

- Atualização de `hospitals.alert_rules` (febre, janela, notificações) e `integration_settings.whatsapp` (URL público do backend, notas).

## Gestão e auditoria (não expostas no OncoCare v1)

- Lista de auditoria via RPC `staff_audit_logs_list`.

## Rotas / navegação antigas (substituídas)

- Segmentos de URL: `painel`, `pacientes`, `mensagens`, `integracao`, `gestao`, `configuracoes`.
- **OncoCare v1** usa: `/` (dashboard), `/pacientes`, `/agenda`.

## UI legada removida (referência)

- Shell em vidro (“glass”), barra lateral com mais itens, tema claro/escuro (`ThemeToggle`), KPIs e filas como componentes dedicados em `components/dashboard/` (ficheiros apagados na migração; lógica replicada nas novas páginas onde aplicável).
