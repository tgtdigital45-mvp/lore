-- Sprint 1 (parte 1/2): adiciona 'hospital_admin' ao enum user_role.
-- Deve ser a ÚNICA instrução desta migration (commit separado no Supabase ao encadear migrations).
-- PG14: não use ADD VALUE IF NOT EXISTS (só a partir do PG15). Usamos DO + EXECUTE e ignoramos se já existir.
-- Se rodar manualmente no SQL Editor, execute só este arquivo e depois o 20260413120100.

DO $$
BEGIN
  EXECUTE 'ALTER TYPE user_role ADD VALUE ''hospital_admin''';
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;
