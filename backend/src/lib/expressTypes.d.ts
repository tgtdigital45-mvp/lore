import type { SupabaseClient } from "@supabase/supabase-js";

declare global {
  namespace Express {
    interface Request {
      /** Raw body buffer (apenas POST /api/whatsapp/webhook para assinatura Meta). */
      rawBody?: Buffer;
      /** Preenchido por `authenticateBearer` após validação JWT. */
      authUser?: { supabase: SupabaseClient; userId: string };
    }
  }
}

export {};
