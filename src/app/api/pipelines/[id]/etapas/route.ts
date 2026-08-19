import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAdmin } from "@/lib/auth/internal-or-tenant";

interface CreateEtapaBody {
  tenant_id?: string;
  nome?: string;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: pipelineId } = await params;
  const body = (await request.json().catch(() => ({}))) as CreateEtapaBody;
  const { tenant_id, nome } = body;
  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  if (!nome?.trim()) return NextResponse.json({ error: "nome required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAdmin(request, tenant_id);
  if (!auth.ok) return auth.response;

  const { data: pipeline } = await auth.admin
    .from("pipelines")
    .select("id")
    .eq("id", pipelineId)
    .eq("tenant_id", tenant_id)
    .maybeSingle();
  if (!pipeline) return NextResponse.json({ error: "pipeline nao encontrado" }, { status: 404 });

  const { count } = await auth.admin
    .from("pipeline_etapas")
    .select("id", { count: "exact", head: true })
    .eq("pipeline_id", pipelineId);

  const { data, error } = await auth.admin
    .from("pipeline_etapas")
    .insert({ pipeline_id: pipelineId, nome: nome.trim(), posicao: count ?? 0 })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ etapa: data });
}
