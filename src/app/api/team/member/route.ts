import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getAdminAndUser(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
  return { user, admin };
}

// PATCH — alterar role
export async function PATCH(request: NextRequest) {
  const { user, admin } = await getAdminAndUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { member_id, role, tenant_id } = await request.json();

  const { data: myRole } = await admin.from("tenant_members")
    .select("role").eq("tenant_id", tenant_id).eq("user_id", user.id).single();
  if (myRole?.role !== "owner") return NextResponse.json({ error: "Apenas o owner pode alterar roles" }, { status: 403 });

  const { data: target } = await admin.from("tenant_members").select("role, user_id").eq("id", member_id).single() as { data: any; error: unknown };
  if (target?.role === "owner") return NextResponse.json({ error: "Não é possível alterar o role do owner" }, { status: 400 });

  await admin.from("tenant_members").update({ role }).eq("id", member_id);
  return NextResponse.json({ success: true });
}

// DELETE — remover membro
export async function DELETE(request: NextRequest) {
  const { user, admin } = await getAdminAndUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { member_id, tenant_id } = await request.json();

  const { data: myRole } = await admin.from("tenant_members")
    .select("role").eq("tenant_id", tenant_id).eq("user_id", user.id).single();
  if (!myRole || !["owner", "admin"].includes(myRole.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { data: target } = await admin.from("tenant_members").select("role").eq("id", member_id).single() as { data: any; error: unknown };
  if (target?.role === "owner") return NextResponse.json({ error: "Não é possível remover o owner" }, { status: 400 });

  await admin.from("tenant_members").delete().eq("id", member_id);
  return NextResponse.json({ success: true });
}
