import { createClient } from "@supabase/supabase-js";
/**
 * Tipos finos: `npx supabase gen types typescript --project-id <id> > src/types/supabase.gen.ts`
 * e então `createClient<Database>(...)`. O stub em `database.gen.ts` não cobre tabelas e quebraria o inferência.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  if (import.meta.env.DEV) {
    console.warn("Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env");
  }
}

export const supabase = createClient(url ?? "", key ?? "");
