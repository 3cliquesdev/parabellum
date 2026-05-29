import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await request.json();
  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // Validar token
  const { data: invite } = await admin.from("invite_tokens")
    .select("*").eq("token", token).single() as { data: any; error: unknown };

  if (!invite) return NextResponse.json({ error: "Convite inválido" }, { status: 400 });
  if (invite.accepted_at) return NextResponse.json({ error: "Convite já utilizado" }, { status: 400 });
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: "Convite expirado" }, { status: 400 });

  // Verificar se já é membro
  const { data: existing } = await admin.from("tenant_members")
    .select("id").eq("tenant_id", invite.tenant_id).eq("user_id", user.id).single();
  if (existing) {
    await admin.from("invite_tokens").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);
    return NextResponse.json({ success: true, tenant_id: invite.tenant_id, already_member: true });
  }

  // Adicionar ao tenant
  const { error: memberError } = await admin.from("tenant_members").insert({
    tenant_id: invite.tenant_id, user_id: user.id, role: invite.role,
  });
  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });

  // Marcar como aceito
  await admin.from("invite_tokens").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);

  return NextResponse.json({ success: true, tenant_id: invite.tenant_id });
}

// GET para validar token sem aceitar (pré-visualização)
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ valid: false });

  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: invite } = await admin.from("invite_tokens")
    .select("*, tenants(name)").eq("token", token).single() as { data: any; error: unknown };

  if (!invite || invite.accepted_at || new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({
    valid: true,
    email: invite.email,
    role: invite.role,
    tenant_name: invite.tenants?.name ?? "Liberty CRM",
    expires_at: invite.expires_at,
  });
}
