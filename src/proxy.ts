import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/pipeline", "/contacts", "/activities", "/inbox", "/settings"];
const AUTH_ROUTES = ["/login", "/signup"];
const ADMIN_PROTECTED = ["/admin"];
const ADMIN_LOGIN = "/admin/login";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));
  const isAdminRoute = ADMIN_PROTECTED.some((p) => pathname.startsWith(p)) && pathname !== ADMIN_LOGIN;

  // Rotas do CRM — redireciona para login se não autenticado
  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Rotas de auth — redireciona para dashboard se já logado
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Rotas admin — redireciona para admin/login se não autenticado
  if (isAdminRoute && !user) {
    return NextResponse.redirect(new URL(ADMIN_LOGIN, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
