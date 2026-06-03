import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LooseDatabase } from "@/types/database";

interface AcceptInviteBody {
  token?: string;
}

interface InviteTenantRow {
  name: string | null;
}

interface InviteTokenRow {
  id: string;
  tenant_id: string;
  role: string;
  email: string;
  expires_at: string;
  accepted_at: string | null;
  tenants?: InviteTenantRow | InviteTenantRow[] | null;
}

function createAdminClient() {
  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

function getTenantName(tenants: InviteTokenRow["tenants"]): string {
  if (Array.isArray(tenants)) return tenants[0]?.name ?? "Liberty CRM";
  return tenants?.name ?? "Liberty CRM";
}

export async function POST(request: NextRequest) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = (await request.json().catch(() => ({}))) as AcceptInviteBody;
  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("invite_tokens")
    .select("*")
    .eq("token", token)
    .single();

  const inviteData = invite as unknown as InviteTokenRow | null;
  if (!inviteData) return NextResponse.json({ error: "Convite invalido" }, { status: 400 });
  if (inviteData.accepted_at) return NextResponse.json({ error: "Convite ja utilizado" }, { status: 400 });
  if (new Date(inviteData.expires_at) < new Date()) {
    return NextResponse.json({ error: "Convite expirado" }, { status: 400 });
  }

  const { data: existing } = await admin
    .from("tenant_members")
    .select("id")
    .eq("tenant_id", inviteData.tenant_id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    await admin
      .from("invite_tokens")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", inviteData.id);

    return NextResponse.json({ success: true, tenant_id: inviteData.tenant_id, already_member: true });
  }

  const { error: memberError } = await admin.from("tenant_members").insert({
    tenant_id: inviteData.tenant_id,
    user_id: user.id,
    role: inviteData.role,
  });
  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });

  await admin
    .from("invite_tokens")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", inviteData.id);

  return NextResponse.json({ success: true, tenant_id: inviteData.tenant_id });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ valid: false });

  const { data: invite } = await createAdminClient()
    .from("invite_tokens")
    .select("*, tenants(name)")
    .eq("token", token)
    .single();

  const inviteData = invite as unknown as InviteTokenRow | null;
  if (!inviteData || inviteData.accepted_at || new Date(inviteData.expires_at) < new Date()) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({
    valid: true,
    email: inviteData.email,
    role: inviteData.role,
    tenant_name: getTenantName(inviteData.tenants),
    expires_at: inviteData.expires_at,
  });
}
