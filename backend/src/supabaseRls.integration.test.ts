import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

/**
 * Requer projeto Supabase de teste e variáveis:
 * SUPABASE_URL, SUPABASE_ANON_KEY (ou VITE_SUPABASE_ANON_KEY)
 * Sem env, os testes são ignorados (não falham o CI local).
 */
const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

const run = Boolean(url && anon);

describe.skipIf(!run)("Supabase RLS (integração)", () => {
  it("cliente anónimo não lê pacientes sem sessão", async () => {
    const sb = createClient(url!, anon!);
    const { data, error } = await sb.from("patients").select("id").limit(1);
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(0);
  });

  it("RPC staff_symptom_cohort_metrics recusa sem staff (quando migração aplicada)", async () => {
    const sb = createClient(url!, anon!);
    const fakeHospital = "00000000-0000-0000-0000-000000000001";
    const { error } = await sb.rpc("staff_symptom_cohort_metrics", {
      p_hospital_id: fakeHospital,
      p_days: 14,
    });
    expect(error).not.toBeNull();
  });
});
