import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/server-middleware";

/** Rotas acessíveis sem sessão (login e callback Supabase). */
function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/auth/")) return true;
  if (pathname.startsWith("/tv/")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  if (!isPublicPath(request.nextUrl.pathname) && !user) {
    const u = request.nextUrl.clone();
    u.pathname = "/";
    u.search = "";
    return NextResponse.redirect(u);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
