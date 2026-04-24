import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!url || !key) {
    const hint =
      "Crie / copie em Supabase (Settings → API): Project URL e anon public. " +
      "Em Vercel: Project → Settings → Environment Variables → adicione NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para Production (e Preview, se quiser) e volte a fazer deploy; variáveis NEXT_PUBLIC_* entram no bundle na altura do build.";
    if (process.env.NODE_ENV === "development") {
      console.warn("Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env. " + hint);
    }
    throw new Error(`Supabase não configurado. ${hint}`);
  }
  return createBrowserClient(url, key);
}
