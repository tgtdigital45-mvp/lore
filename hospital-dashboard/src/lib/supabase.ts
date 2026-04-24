import { createClient } from "./supabase/client";

/** Instância browser partilhada (comportamento equivalente ao Vite + createClient). */
export const supabase = createClient();
