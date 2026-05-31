import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/pipeline", "/contacts", "/activities", "/inbox", "/settings", "/agency"];
const AUTH_ROUTES = ["/login", "/signup"];
const PLATFORM_DOMAINS = ["liberty-crm-six.vercel.app", "localhost", "libertycrm.com.br"];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  // Ignorar assets e API
  if (pathname.startsWith("/api/") || pathname.startsWith("/admin")) {
    return supabaseResponse;
  }

  const hostname = request.headers.get("host")?.split(":")[0] ?? "";

  // ── Detecção de domínio customizado de agência ──
  const isPlatformDomain =
    !hostname ||
    PLATFORM_DOMAINS.some(d => hostname === d || hostname.endsWith("." + d));

  if (!isPlatformDomain) {
    try {
      const adminClient = createServerClient<any>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll: () => [], setAll: () => {} } }
      );
      const { data: agency } = await adminClient
        .from("agencies")
        .select("id, slug, status, domain_status")
        .eq("custom_domain", hostname)
        .eq("domain_status", "active")
        .eq("status", "active")
        .single();

      if (!agency) {
        return new NextResponse("Domain not configured", { status: 404 });
      }

      supabaseResponse = NextResponse.next({ request });
      supabaseResponse.headers.set("x-agency-id", agency.id);
      supabaseResponse.headers.set("x-agency-slug", agency.slug);
    } catch {
      // Tabela ainda não existe — continua normalmente
    }
  }

  // ── Auth guard ──
  const supabase = createServerClient<any>(
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
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
