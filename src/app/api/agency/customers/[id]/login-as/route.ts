import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import type { LooseDatabase } from "@/types/database";

interface TenantRow {
  id: string;
  name: string;
  agency_id: string | null;
}

interface AgencyUserRow {
  role: "owner" | "admin" | "staff";
  agency_id: string;
}

interface ImpersonationSessionRow {
  id: string;
}

interface AgencyRow {
  display_name: string | null;
  name: string | null;
}

interface LoginAsBody {
  reason?: string;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: tenantId } = await params;
  const cookieStore = await cookies();

  const supabase = createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: tenant } = await admin
    .from("tenants")
    .select("id, name, agency_id")
    .eq("id", tenantId)
    .single();

  const currentTenant = tenant as unknown as TenantRow | null;
  if (!currentTenant) {
    return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 });
  }

  const { data: agencyUser } = await admin
    .from("agency_users")
    .select("role, agency_id")
    .eq("user_id", user.id)
    .eq("agency_id", currentTenant.agency_id ?? "")
    .single();

  const currentAgencyUser = agencyUser as unknown as AgencyUserRow | null;
  if (!currentAgencyUser || !["owner", "admin", "staff"].includes(currentAgencyUser.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as LoginAsBody;
  const reason = body.reason ?? "Suporte técnico";

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  const { data: session } = await admin
    .from("impersonation_sessions")
    .insert({
      agency_user_id: user.id,
      agency_id: currentAgencyUser.agency_id,
      target_tenant_id: tenantId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      reason,
      ip_address: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
    })
    .select("id")
    .single();

  const impersonationSession = session as unknown as ImpersonationSessionRow | null;

  const { data: agency } = await admin
    .from("agencies")
    .select("display_name, name")
    .eq("id", currentAgencyUser.agency_id)
    .single();

  const currentAgency = agency as unknown as AgencyRow | null;

  await admin.from("agency_audit_logs").insert({
    agency_id: currentAgencyUser.agency_id,
    user_id: user.id,
    action: "login_as",
    entity_type: "tenant",
    entity_id: tenantId,
    details: { tenant_name: currentTenant.name, reason },
    ip_address: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip"),
  });

  const agencyName = currentAgency?.display_name ?? currentAgency?.name ?? "Agência";

  const response = NextResponse.json({
    success: true,
    session_id: impersonationSession?.id,
    tenant_name: currentTenant.name,
    agency_name: agencyName,
    expires_at: expiresAt.toISOString(),
  });

  response.cookies.set("impersonation_session", JSON.stringify({
    session_id: impersonationSession?.id,
    tenant_id: tenantId,
    tenant_name: currentTenant.name,
    agency_name: agencyName,
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
