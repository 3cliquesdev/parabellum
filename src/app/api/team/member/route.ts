import { NextRequest, NextResponse } from "next/server";
import { assertTenantMember, type AdminClient } from "@/lib/auth/guard";

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

/** Confirma que o membro-alvo realmente pertence ao tenant informado. */
async function loadTargetMember(
  admin: AdminClient,
  memberId: string,
  tenantId: string,
): Promise<Pick<TenantMemberRow, "role" | "user_id"> | null> {
  const { data } = await admin
    .from("tenant_members")
    .select("role, user_id, tenant_id")
    .eq("id", memberId)
    .maybeSingle();
  const row = data as unknown as (TenantMemberRow | null);
  if (!row || row.tenant_id !== tenantId) return null;
  return { role: row.role, user_id: row.user_id };
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as TeamMemberBody;
  const { member_id, role, tenant_id, departamento, disponivel } = body;
  if (!member_id || !tenant_id) {
    return NextResponse.json({ error: "member_id e tenant_id sao obrigatorios" }, { status: 400 });
  }

  const auth = await assertTenantMember(tenant_id);
  if (!auth.ok) return auth.response;
  const { admin, role: callerRole } = auth;

  const target = await loadTargetMember(admin, member_id, tenant_id);
  if (!target) {
    return NextResponse.json({ error: "Membro nao encontrado neste tenant" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};

  if (role !== undefined) {
    if (callerRole !== "owner") {
      return NextResponse.json({ error: "Apenas o owner pode alterar roles" }, { status: 403 });
    }
    if (target.role === "owner") {
      return NextResponse.json({ error: "Não é possível alterar o role do owner" }, { status: 400 });
    }
    updates.role = role;
  }

  if (departamento !== undefined) updates.departamento = departamento;

  if (disponivel !== undefined) {
    updates.disponivel = disponivel;

    if (disponivel === true && target.user_id) {
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://liberty-crm-six.vercel.app"}/api/team/process-queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-key": process.env.SUPABASE_SERVICE_ROLE_KEY! },
        body: JSON.stringify({ tenant_id, agent_id: target.user_id }),
      }).catch(() => {});
    }
  }

  if (Object.keys(updates).length > 0) {
    await admin.from("tenant_members").update(updates).eq("id", member_id);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const body = (await request.json()) as Pick<TeamMemberBody, "member_id" | "tenant_id">;
  const { member_id, tenant_id } = body;
  if (!member_id || !tenant_id) {
    return NextResponse.json({ error: "member_id e tenant_id sao obrigatorios" }, { status: 400 });
  }

  const auth = await assertTenantMember(tenant_id);
  if (!auth.ok) return auth.response;
  const { admin, role: callerRole } = auth;

  if (!["owner", "admin"].includes(callerRole)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const target = await loadTargetMember(admin, member_id, tenant_id);
  if (!target) {
    return NextResponse.json({ error: "Membro nao encontrado neste tenant" }, { status: 404 });
  }
  if (target.role === "owner") {
    return NextResponse.json({ error: "Não é possível remover o owner" }, { status: 400 });
  }

  await admin.from("tenant_members").delete().eq("id", member_id);
  return NextResponse.json({ success: true });
}
