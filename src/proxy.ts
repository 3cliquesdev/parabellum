import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { LooseDatabase } from "@/types/database";

const PROTECTED = [
  "/dashboard",
  "/pipeline",
  "/contacts",
  "/activities",
  "/inbox",
  "/settings",
  "/broadcasts",
  "/ia",
];
const AUTH_ROUTES = ["/login", "/signup"];

// Papeis do time financeiro so tratam tickets (ex: reembolso) - nunca devem
// acessar a inbox de conversas dos outros times, mesmo digitando a URL direto.
const ROLES_SO_TICKETS = ["financeiro", "gerente_financeiro"];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  // Ignorar assets e API
  if (pathname.startsWith("/api/") || pathname.startsWith("/admin")) {
    return supabaseResponse;
  }

  // ── Auth guard ──
  const supabase = createServerClient<LooseDatabase>(
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
  const isProtected = PROTECTED.some(p => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some(p => pathname.startsWith(p));

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && (isAuthRoute || (isProtected && !pathname.startsWith("/tickets")))) {
    const { data: membership } = await supabase
      .from("tenant_members")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const role = (membership as { role?: string } | null)?.role;
    const somenteTickets = role ? ROLES_SO_TICKETS.includes(role) : false;

    if (isAuthRoute) {
      return NextResponse.redirect(new URL(somenteTickets ? "/tickets" : "/dashboard", request.url));
    }
    if (somenteTickets) {
      return NextResponse.redirect(new URL("/tickets", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
