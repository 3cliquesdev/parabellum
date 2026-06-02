import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenant_id = searchParams.get("tenant_id");
  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const { data, error } = await adminClient()
    .from("tenants")
    .select("nome_fantasia, cor_primaria, logo_url, white_label")
    .eq("id", tenant_id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ branding: data });
}

export async function PATCH(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tenant_id, nome_fantasia, cor_primaria, logo_url } = await request.json();
  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const admin = adminClient();

  // Verificar que o usuário é owner/admin do tenant
  const { data: members } = await admin
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenant_id)
    .eq("user_id", user.id)
    .limit(1);

  const member = members?.[0];
  if (!member || !["owner", "admin"].includes(member.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { error } = await admin
    .from("tenants")
    .update({
      nome_fantasia: nome_fantasia || null,
      cor_primaria: cor_primaria || "#9aea62",
      logo_url: logo_url || null,
    })
    .eq("id", tenant_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
