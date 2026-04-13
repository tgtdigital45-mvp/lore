import { supabase } from "@/src/lib/supabase";

/** `auth.uid()` do utilizador que regista (paciente ou cuidador) — auditoria em `symptom_logs.logged_by_profile_id`. */
export async function loggedByProfileIdForInsert(): Promise<string | undefined> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id;
}
