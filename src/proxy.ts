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

// Papeis do time financeiro so tratam tickets (ex: reembolso) - nunca devem
// acessar a inbox de conversas dos outros times, mesmo digitando a URL direto.
const ROLES_SO_TICKETS = ["financeiro", "gerente_financeiro"];
const ROLES_OPERACIONAIS = ["vendedor", "atendente", "consultor"];
const ROTAS_RESTRITAS_OPERACIONAIS = ["/pipeline", "/broadcasts", "/ia"];
const AUTH_TIMEOUT_MS = 2_500;

// Cache assinado do cargo do usuario, pra nao bater no banco (tenant_members)
// em toda navegacao pra rota protegida - com o time todo usando o sistema ao
// mesmo tempo, isso multiplicava consultas no Postgres (max_connections=60,
// ja rodando perto do limite) e cada uma delas tinha timeout de 2.5s, entao
// qualquer soluco na Supabase virava ate 5s de espera por pagina. TTL curto
// de proposito: essa restricao de cargo (financeiro so ve tickets, cargos
// operacionais fora de pipeline/broadcasts/ia) so e aplicada aqui no proxy,
// nenhuma rota de API revalida - um TTL longo deixaria alguem rebaixado de
// cargo com acesso indevido por mais tempo depois da mudanca.
const ROLE_CACHE_COOKIE = "tm_role_cache";
const ROLE_CACHE_TTL_MS = 60 * 1000;

async function hmacKey() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toBase64Url(bytes: ArrayBuffer) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signRoleCache(userId: string, role: string, expiresAt: number) {
  const payload = `${userId}:${role}:${expiresAt}`;
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(), new TextEncoder().encode(payload));
  return `${payload}.${toBase64Url(signature)}`;
}

async function readRoleCache(cookieValue: string | undefined, userId: string): Promise<string | null> {
  if (!cookieValue) return null;
  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature) return null;

  const [cachedUserId, role, expiresAtRaw] = payload.split(":");
  const expiresAt = Number(expiresAtRaw);
  if (cachedUserId !== userId || !role || !expiresAt || Date.now() > expiresAt) return null;

  const expectedSignature = await crypto.subtle.sign("HMAC", await hmacKey(), new TextEncoder().encode(payload));
  if (toBase64Url(expectedSignature) !== signature) return null;

  return role;
}

async function withTimeout<T>(promise: PromiseLike<T>): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), AUTH_TIMEOUT_MS); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  // Ignorar assets e API
  if (pathname.startsWith("/api/") || pathname.startsWith("/admin")) {
    return supabaseResponse;
  }

  const isProtected = PROTECTED.some(p => pathname.startsWith(p));

  // Paginas publicas e de autenticacao nao precisam validar sessao no edge.
  // Isso evita uma tempestade de GET /auth/v1/user a cada carregamento de
  // login/signup quando o banco esta sob pressao. As rotas protegidas abaixo
  // continuam exigindo usuario autenticado e cargo valido.
  if (!isProtected) return supabaseResponse;

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

  const authResult = await withTimeout(supabase.auth.getUser());
  const user = authResult?.data.user ?? null;

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && !pathname.startsWith("/tickets")) {
    const cachedRole = await readRoleCache(request.cookies.get(ROLE_CACHE_COOKIE)?.value, user.id);
    let role: string | undefined;

    if (cachedRole !== null) {
      role = cachedRole === "none" ? undefined : cachedRole;
    } else {
      const membershipResult = await withTimeout(supabase
        .from("tenant_members")
        .select("role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle());
      // Em caso de timeout, falhar fechado para rotas protegidas em vez de
      // permitir acesso sem saber o cargo do usuario.
      if (!membershipResult && isProtected) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
      const membership = membershipResult?.data ?? null;
      role = (membership as { role?: string } | null)?.role;

      const expiresAt = Date.now() + ROLE_CACHE_TTL_MS;
      const cacheValue = await signRoleCache(user.id, role ?? "none", expiresAt);
      supabaseResponse.cookies.set(ROLE_CACHE_COOKIE, cacheValue, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: ROLE_CACHE_TTL_MS / 1000,
        path: "/",
      });
    }

    const somenteTickets = role ? ROLES_SO_TICKETS.includes(role) : false;
    const operacional = role ? ROLES_OPERACIONAIS.includes(role) : false;

    if (somenteTickets) {
      return NextResponse.redirect(new URL("/tickets", request.url));
    }
    if (operacional && ROTAS_RESTRITAS_OPERACIONAIS.some((route) => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL("/negocios", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
