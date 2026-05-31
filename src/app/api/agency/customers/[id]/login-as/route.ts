import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { randomBytes, createHash } from "crypto";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: tenantId } = await params;
  const cookieStore = await cookies();

  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // Verificar que o tenant pertence à agência do usuário
  const { data: tenant } = await admin
    .from("tenants")
    .select("id, name, agency_id")
    .eq("id", tenantId)
    .single() as { data: any };

  if (!tenant) return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 });

  const { data: agencyUser } = await admin
    .from("agency_users")
    .select("role, agency_id")
    .eq("user_id", user.id)
    .eq("agency_id", tenant.agency_id)
    .single() as { data: any };

  if (!agencyUser || !["owner", "admin", "staff"].includes(agencyUser.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const reason = body.reason ?? "Suporte técnico";

  // Gerar token seguro
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

  const { data: session } = await admin
    .from("impersonation_sessions")
    .insert({
      agency_user_id: user.id,
      agency_id: agencyUser.agency_id,
      target_tenant_id: tenantId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      reason,
      ip_address: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    })
    .select("id")
    .single() as { data: any };

  // Buscar agência para o nome
  const { data: agency } = await admin.from("agencies").select("display_name, name").eq("id", agencyUser.agency_id).single() as { data: any };

  // Registrar auditoria
  await admin.from("agency_audit_logs").insert({
    agency_id: agencyUser.agency_id,
    user_id: user.id,
    action: "login_as",
    entity_type: "tenant",
    entity_id: tenantId,
    details: { tenant_name: tenant.name, reason },
    ip_address: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip"),
  });

  const response = NextResponse.json({
    success: true,
    session_id: session?.id,
    tenant_name: tenant.name,
    agency_name: agency?.display_name ?? agency?.name ?? "Agência",
    expires_at: expiresAt.toISOString(),
  });

  // Cookie de impersonation
  response.cookies.set("impersonation_session", JSON.stringify({
    session_id: session?.id,
    tenant_id: tenantId,
    tenant_name: tenant.name,
    agency_name: agency?.display_name ?? agency?.name ?? "Agência",
    token,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1800,
    path: "/",
  });

  return response;
}
