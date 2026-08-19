import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAdmin } from "@/lib/auth/internal-or-tenant";

interface UpdatePipelineBody {
  tenant_id?: string;
  nome?: string;
  is_default?: boolean;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: pipelineId } = await params;
  const body = (await request.json().catch(() => ({}))) as UpdatePipelineBody;
  const { tenant_id } = body;
  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAdmin(request, tenant_id);
  if (!auth.ok) return auth.response;

  if (body.is_default) {
    // So um pipeline padrao por tenant - desmarca os outros antes.
    await auth.admin.from("pipelines").update({ is_default: false }).eq("tenant_id", tenant_id);
  }

  const updates: Record<string, unknown> = {};
  if (body.nome !== undefined) updates.nome = body.nome.trim();
  if (body.is_default !== undefined) updates.is_default = body.is_default;

  const { data, error } = await auth.admin
    .from("pipelines")
    .update(updates)
    .eq("id", pipelineId)
    .eq("tenant_id", tenant_id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "pipeline nao encontrado" }, { status: 404 });
  return NextResponse.json({ pipeline: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: pipelineId } = await params;
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAdmin(request, tenantId);
  if (!auth.ok) return auth.response;

  const { count: totalPipelines } = await auth.admin
    .from("pipelines")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  if ((totalPipelines ?? 0) <= 1) {
    return NextResponse.json({ error: "nao e possivel excluir o unico pipeline do tenant" }, { status: 400 });
  }

  const { count: negociosVinculados } = await auth.admin
    .from("negocios")
    .select("id", { count: "exact", head: true })
    .eq("pipeline_id", pipelineId);
  if ((negociosVinculados ?? 0) > 0) {
    return NextResponse.json({ error: "mova os negocios desse pipeline antes de exclui-lo" }, { status: 400 });
  }

  const { error } = await auth.admin.from("pipelines").delete().eq("id", pipelineId).eq("tenant_id", tenantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
