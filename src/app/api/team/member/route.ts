import { NextRequest, NextResponse } from "next/server";
import { assertTenantMember, type AdminClient } from "@/lib/auth/guard";
import { getInternalApiSecret } from "@/lib/security/internal-auth";
import { reassignAgentActiveConversations } from "@/lib/dispatch";

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
  department_ids?: string[];
  availability_status?: "online" | "away" | "offline";
  max_concurrent_chats?: number;
  receber_alertas_operacionais?: boolean;
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
  const { member_id, role, tenant_id, department_ids, availability_status, max_concurrent_chats, receber_alertas_operacionais } = body;
  if (!member_id || !tenant_id) {
    return NextResponse.json({ error: "member_id e tenant_id sao obrigatorios" }, { status: 400 });
  }

  const auth = await assertTenantMember(tenant_id);
  if (!auth.ok) return auth.response;
  const { admin, role: callerRole, user: callerUser } = auth;

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

  if (max_concurrent_chats !== undefined) updates.max_concurrent_chats = max_concurrent_chats;
  if (availability_status !== undefined) updates.availability_status = availability_status;
  if (receber_alertas_operacionais !== undefined) {
    // Bug corrigido: comparava callerRole com target.role (cargo com cargo) pra
    // decidir "e o proprio usuario?", em vez de comparar o id de quem chama
    // com o id do alvo. Como o alvo quase sempre tem o mesmo cargo de quem
    // esta editando a propria linha, o bug so aparecia quando um gerente_geral
    // (nao incluido na lista de gerentes por engano) tentava mexer no alerta
    // de alguem com cargo diferente do seu - falhava calado (retornava
    // success:true sem gravar nada).
    const ehGerente = ["owner", "gerente", "gerente_geral"].includes(callerRole);
    const ehOProprioUsuario = callerUser.id === target.user_id;
    if (!ehGerente && !ehOProprioUsuario) {
      return NextResponse.json({ error: "Sem permissão para alterar alertas de outro usuário" }, { status: 403 });
    }
    updates.receber_alertas_operacionais = receber_alertas_operacionais;
  }

  if (Object.keys(updates).length > 0) {
    await admin.from("tenant_members").update(updates).eq("id", member_id);
  }

  if (availability_status !== undefined && target.user_id) {
    if (availability_status === "online") {
      const internalSecret = getInternalApiSecret();
      if (!internalSecret) {
        return NextResponse.json({ error: "INTERNAL_API_SECRET nao configurado" }, { status: 503 });
      }
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://3cliques-crm.vercel.app"}/api/team/process-queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-key": internalSecret },
        body: JSON.stringify({ tenant_id, agent_id: target.user_id }),
      }).catch(() => {});
    }

    if (availability_status === "offline") {
      // Status ja foi gravado como offline acima, entao o proprio agente
      // nunca e escolhido de volta. Aguarda de verdade (nao dispara-e-esquece):
      // o cliente nao pode ficar sem ninguem porque a redistribuicao nao
      // terminou a tempo.
      await reassignAgentActiveConversations(tenant_id, target.user_id);
    }
  }

  if (department_ids !== undefined && target.user_id) {
    await admin.from("agent_departments").delete().eq("tenant_id", tenant_id).eq("user_id", target.user_id);
    if (department_ids.length > 0) {
      await admin.from("agent_departments").insert(
        department_ids.map((departmentId, index) => ({
          tenant_id,
          user_id: target.user_id,
          department_id: departmentId,
          is_primary: index === 0,
        })),
      );
    }
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

  if (!["owner", "gerente"].includes(callerRole)) {
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
