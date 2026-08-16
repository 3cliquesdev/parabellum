import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";

interface UpdateEtapaBody {
  tenant_id?: string;
  nome?: string;
  posicao?: number;
  e_ganho?: boolean;
  e_perdido?: boolean;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; etapaId: string }> }) {
  const { id: pipelineId, etapaId } = await params;
  const body = (await request.json().catch(() => ({}))) as UpdateEtapaBody;
  const { tenant_id } = body;
  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenant_id);
  if (!auth.ok) return auth.response;

  const { data: pipeline } = await auth.admin
    .from("pipelines")
    .select("id")
    .eq("id", pipelineId)
    .eq("tenant_id", tenant_id)
    .maybeSingle();
  if (!pipeline) return NextResponse.json({ error: "pipeline nao encontrado" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (body.nome !== undefined) updates.nome = body.nome.trim();
  if (body.posicao !== undefined) updates.posicao = body.posicao;
  if (body.e_ganho !== undefined) updates.e_ganho = body.e_ganho;
  if (body.e_perdido !== undefined) updates.e_perdido = body.e_perdido;

  const { data, error } = await auth.admin
    .from("pipeline_etapas")
    .update(updates)
    .eq("id", etapaId)
    .eq("pipeline_id", pipelineId)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "etapa nao encontrada" }, { status: 404 });
  return NextResponse.json({ etapa: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; etapaId: string }> }) {
  const { id: pipelineId, etapaId } = await params;
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;

  const { count } = await auth.admin
    .from("pipeline_etapas")
    .select("id", { count: "exact", head: true })
    .eq("pipeline_id", pipelineId);
  if ((count ?? 0) <= 1) {
    return NextResponse.json({ error: "o pipeline precisa de pelo menos 1 etapa" }, { status: 400 });
  }

  const { count: negociosVinculados } = await auth.admin
    .from("negocios")
    .select("id", { count: "exact", head: true })
    .eq("pipeline_etapa_id", etapaId);
  if ((negociosVinculados ?? 0) > 0) {
    return NextResponse.json({ error: "mova os negocios dessa etapa antes de exclui-la" }, { status: 400 });
  }

  const { error } = await auth.admin.from("pipeline_etapas").delete().eq("id", etapaId).eq("pipeline_id", pipelineId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
