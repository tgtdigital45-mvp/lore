# Hospital dashboard — sprint e tarefas

## Objetivo do MVP

Entregar o **dashboard web da equipe** (Aura Onco Hospital) funcional com autenticação Supabase, triagem por risco e lista de pacientes da lotação, alinhado ao RLS existente.

## Concluído (sprint atual)

- [x] Autenticação (login / cadastro staff) e vínculo ao hospital demo (`staffLink.ts`).
- [x] Carga de pacientes + sintomas (7 dias) e ordenação por gravidade.
- [x] Filtro por tipo de tumor e busca por nome na coluna direita.
- [x] Navegação lateral: **Painel**, **Triagem**, **Pacientes** (aba Pacientes com tabela dedicada, não duplica só o scroll da triagem).
- [x] Seleção de linha na aba Pacientes: painel de detalhe mínimo + **`record_audit` (`VIEW_PATIENT`)** para trilha HIPAA.

## Próximas tarefas (backlog)

1. **Prontuário expandido**: ciclos de tratamento, timeline de `symptom_logs`, documentos (`medical_documents`) com permissões já definidas no schema.
2. **Filtro por hospital** quando o usuário tiver várias lotações (`staff_assignments` já retorna múltiplos `hospital_id`).
3. **Exportação**: CSV/PDF da lista de pacientes (somente dados permitidos pela política).
4. **Mensagens / Laboratório**: placeholders na sidebar até definição de produto.
5. **CI**: `npm run build` no `hospital-dashboard` no pipeline (GitHub Actions).

## Como validar localmente

1. `cd hospital-dashboard && npm ci && npm run build`
2. Configurar `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (mesmo projeto do app mobile).
3. Aplicar migrações Supabase (incl. política de insert em `staff_assignments` para demo, se usar cadastro staff).
