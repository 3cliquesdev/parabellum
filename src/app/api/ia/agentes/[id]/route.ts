import { NextRequest, NextResponse } from "next/server";
import { assertTenantAdmin } from "@/lib/auth/guard";
import { syncAgenteToN8n } from "@/lib/ia-agentes/n8n-sync";

interface UpdateAgenteBody {
  tenant_id?: string;
  nome?: string;
  persona?: string;
  modelo?: string;
  temperatura?: number;
  ativo?: boolean;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as UpdateAgenteBody;
  if (!body.tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await assertTenantAdmin(body.tenant_id);
  if (!auth.ok) return auth.response;

  const { data: existing } = await auth.admin
    .from("ia_agentes")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", body.tenant_id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Agente nao encontrado" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (body.nome !== undefined) updates.nome = body.nome;
  if (body.persona !== undefined) updates.persona = body.persona;
  if (body.modelo !== undefined) updates.modelo = body.modelo;
  if (body.temperatura !== undefined) updates.temperatura = body.temperatura;
  if (body.ativo !== undefined) updates.ativo = body.ativo;

  const { data: updated, error } = await auth.admin
    .from("ia_agentes")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const agenteAtualizado = updated as {
    persona: string; modelo: string; temperatura: number;
    n8n_workflow_id: string | null; n8n_node_agente: string | null; n8n_node_modelo: string | null;
  };

  const syncResult = await syncAgenteToN8n(agenteAtualizado);
  await auth.admin
    .from("ia_agentes")
    .update({
      ultima_sincronizacao: syncResult.ok ? new Date().toISOString() : existing.ultima_sincronizacao,
      ultimo_erro_sincronizacao: syncResult.ok ? null : syncResult.error,
    })
    .eq("id", id);

  return NextResponse.json({ agente: updated, sync: syncResult });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  const auth = await assertTenantAdmin(tenantId);
  if (!auth.ok) return auth.response;

  const { data: existing } = await auth.admin
    .from("ia_agentes")
    .select("papel")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Agente nao encontrado" }, { status: 404 });
  if ((existing as { papel: string }).papel !== "personalizado") {
    return NextResponse.json({ error: "Este agente esta ligado a um fluxo do n8n e so pode ser desativado, nao excluido" }, { status: 400 });
  }

  await auth.admin.from("ia_agentes").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
