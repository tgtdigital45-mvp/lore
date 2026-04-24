import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

function createSupabaseForMiddleware(request: NextRequest, response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

/**
 * Atualiza cookies de sessão (PKCE) e devolve a resposta a anexar ao `return` do middleware.
 * Usar `getUser()` em vez de `getSession` na decisão de acesso, conforme Supabase.
 */
export async function updateSession(
  request: NextRequest
): Promise<{ response: NextResponse; user: User | null }> {
  const response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createSupabaseForMiddleware(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { response, user };
}
