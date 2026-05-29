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

  const { email, role, tenant_id } = await request.json();
  if (!email || !role || !tenant_id) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // Verificar se solicitante é owner/admin
  const { data: myRole } = await admin.from("tenant_members")
    .select("role").eq("tenant_id", tenant_id).eq("user_id", user.id).single();
  if (!myRole || !["owner", "admin"].includes(myRole.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // Verificar se email já é membro
  const { data: existingUser } = await admin.from("auth.users" as any).select("id").eq("email", email).single();
  if (existingUser) {
    const { data: alreadyMember } = await admin.from("tenant_members")
      .select("id").eq("tenant_id", tenant_id).eq("user_id", (existingUser as any).id).single();
    if (alreadyMember) return NextResponse.json({ error: "Este usuário já é membro" }, { status: 400 });
  }

  // Buscar info do tenant
  const { data: tenant } = await admin.from("tenants").select("name").eq("id", tenant_id).single();

  // Criar invite token
  const { data: invite, error: inviteError } = await admin.from("invite_tokens").insert({
    tenant_id, email, role, invited_by: user.id,
  }).select("token").single();

  if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 });

  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://liberty-crm-six.vercel.app"}/invite?token=${invite.token}`;

  // Enviar convite via Supabase Auth (envia email automaticamente)
  try {
    await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: inviteUrl,
      data: { invite_token: invite.token, tenant_name: tenant?.name ?? "Liberty CRM" },
    });
  } catch {
    // Se falhar (usuário já existe), apenas retorna o link
  }

  return NextResponse.json({ success: true, invite_url: inviteUrl, token: invite.token });
}
