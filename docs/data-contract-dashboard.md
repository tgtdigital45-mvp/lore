# Contrato de dados — Dashboard hospitalar (Sprint 1)

Referência rápida de **tabelas e campos** consumidos ou previstos pelo `hospital-dashboard`, com RLS no Supabase.

## Autenticação e papéis

| Origem | Uso |
|--------|-----|
| `auth.users` | Sessão Supabase Auth |
| `profiles.id`, `profiles.role` | `user_role`: inclui `hospital_admin` (gestão) além de `patient`, `caregiver`, `doctor`, `nurse` |
| `staff_assignments` | Vincula `staff_id` a `hospital_id`; **todo** acesso clínico ao paciente exige linha aqui para o hospital do paciente |

## Paciente e prontuário

| Tabela | Leitura staff | Notas |
|--------|---------------|--------|
| `patients` | Mesmo `hospital_id` que `staff_assignments` | INSERT/UPDATE staff conforme políticas atuais |
| `profiles` (paciente) | Indireto via join em `patients` | Política “Medical staff can view hospital patients profiles” |
| `profiles.phone_e164`, `whatsapp_opt_in_*` | Mesmo critério quando exposto na query | Preenchimento futuro pelo app (LGPD) |

## Sintomas e tratamento

| Tabela | Uso no painel |
|--------|----------------|
| `symptom_logs` | Triagem, modal, histórico |
| `treatment_cycles` | Histórico de quimioterapia no modal |

## Exames e biomarcadores

| Tabela | Uso |
|--------|-----|
| `medical_documents` | Metadados / laudos (staff: policy de leitura por hospital) |
| `biomarker_logs` | Séries laboratoriais (staff: policy “Hospital staff read biomarker logs”, Sprint 1) |

## Auditoria

| Tabela / função | Uso |
|-----------------|-----|
| `audit_logs` | RPC `record_audit` ao abrir prontuário no dashboard |
| `staff_audit_logs_list(p_limit)` | Lista consolidada (paciente, profissional) para a lotação; **Gestão** (gestor) |
| `outbound_messages` | Histórico de envios WhatsApp (leitura staff); inserts pelo **onco-backend** (service role) |
| `record_audit` · `WHATSAPP_OUTBOUND` | Após envio com sucesso (backend chama com JWT do staff) |
| `biomarker_logs` | Tabela resumida no modal; RLS Sprint 1 (staff do hospital) |
| `medical_documents` | Lista no modal; ficheiro via **`GET /api/staff/exams/:id/view`** (presign R2; `inline-ocr/` = só metadados); staff pode **inserir** linhas (OCR) conforme políticas Sprint 6 |
| `POST /api/staff/ocr/analyze` (onco-backend) | Corpo: `patient_id` (uuid) + mesmo payload que `/api/ocr/analyze` (`imageBase64`, `mimeType`, `documentType?`); valida lotação em `staff_assignments` |

## Hospital e regras

| Campo / ação | Uso |
|--------------|-----|
| `hospitals.alert_rules` (JSON) | `fever_celsius_min`, `alert_window_hours`; opcional `notify_email_enabled`, `notify_dashboard_banner` (preferências; envio na Sprint 4) |
| `hospitals.integration_settings` (JSON) | Preferências não secretas, ex.: `whatsapp.public_backend_url`, `whatsapp.notes` (URLs de callback derivadas no UI; segredos Meta ficam no **backend**) |
| `UPDATE hospitals` | Somente `profiles.role = hospital_admin` com `staff_assignments` ao hospital |

## Próximas extensões (sprints seguintes)

- Tabela `outbound_messages` para WhatsApp + webhook Meta.
