import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LooseDatabase } from "@/types/database";

interface TenantMemberRow {
  id?: string;
  tenant_id?: string;
  user_id?: string;
  role?: string;
}

interface TeamMemberBody {
  member_id?: string;
  role?: string;
  tenant_id?: string;
  departamento?: string;
  disponivel?: boolean;
}

async function getAdminAndUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  return { user, admin };
}

export async function PATCH(request: NextRequest) {
  const { user, admin } = await getAdminAndUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as TeamMemberBody;
  const { member_id, role, tenant_id, departamento, disponivel } = body;
  if (!member_id || !tenant_id) {
    return NextResponse.json({ error: "member_id e tenant_id sao obrigatorios" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (role !== undefined) {
    const { data: myRole } = await admin
      .from("tenant_members")
      .select("role")
      .eq("tenant_id", tenant_id)
      .eq("user_id", user.id)
      .single();

    const currentMemberRole = myRole as unknown as Pick<TenantMemberRow, "role"> | null;
    if (currentMemberRole?.role !== "owner") {
      return NextResponse.json({ error: "Apenas o owner pode alterar roles" }, { status: 403 });
    }

    const { data: target } = await admin
      .from("tenant_members")
      .select("role")
      .eq("id", member_id)
      .single();

    const targetMember = target as unknown as Pick<TenantMemberRow, "role"> | null;
    if (targetMember?.role === "owner") {
      return NextResponse.json({ error: "Não é possível alterar o role do owner" }, { status: 400 });
    }

    updates.role = role;
  }

  if (departamento !== undefined) updates.departamento = departamento;

  if (disponivel !== undefined) {
    updates.disponivel = disponivel;

    if (disponivel === true) {
      const { data: member } = await admin
        .from("tenant_members")
        .select("user_id")
        .eq("id", member_id)
        .single();

      const currentMember = member as unknown as Pick<TenantMemberRow, "user_id"> | null;
      if (currentMember?.user_id) {
        fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://liberty-crm-six.vercel.app"}/api/team/process-queue`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-internal-key": process.env.SUPABASE_SERVICE_ROLE_KEY! },
          body: JSON.stringify({ tenant_id, agent_id: currentMember.user_id }),
        }).catch(() => {});
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    await admin.from("tenant_members").update(updates).eq("id", member_id);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { user, admin } = await getAdminAndUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Pick<TeamMemberBody, "member_id" | "tenant_id">;
  const { member_id, tenant_id } = body;
  if (!member_id || !tenant_id) {
    return NextResponse.json({ error: "member_id e tenant_id sao obrigatorios" }, { status: 400 });
  }

  const { data: myRole } = await admin
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenant_id)
    .eq("user_id", user.id)
    .single();

  const currentMemberRole = myRole as unknown as Pick<TenantMemberRow, "role"> | null;
  if (!currentMemberRole || !["owner", "admin"].includes(currentMemberRole.role ?? "")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { data: target } = await admin
    .from("tenant_members")
    .select("role")
    .eq("id", member_id)
    .single();

  const targetMember = target as unknown as Pick<TenantMemberRow, "role"> | null;
  if (targetMember?.role === "owner") {
    return NextResponse.json({ error: "Não é possível remover o owner" }, { status: 400 });
  }

  await admin.from("tenant_members").delete().eq("id", member_id);
  return NextResponse.json({ success: true });
}
