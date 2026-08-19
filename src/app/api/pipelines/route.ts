import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAdmin, resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";

interface CreatePipelineBody {
  tenant_id?: string;
  nome?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;

  const { data: pipelines, error } = await auth.admin
    .from("pipelines")
    .select("*, pipeline_etapas(id, nome, posicao, e_ganho, e_perdido)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: contagens } = await auth.admin
    .from("negocios")
    .select("pipeline_id")
    .eq("tenant_id", tenantId);

  const contagemPorPipeline = new Map<string, number>();
  for (const row of (contagens ?? []) as { pipeline_id: string | null }[]) {
    if (!row.pipeline_id) continue;
    contagemPorPipeline.set(row.pipeline_id, (contagemPorPipeline.get(row.pipeline_id) ?? 0) + 1);
  }

  const resultado = ((pipelines ?? []) as unknown as { id: string; pipeline_etapas: { posicao: number }[] }[]).map((p) => ({
    ...p,
    pipeline_etapas: [...p.pipeline_etapas].sort((a, b) => a.posicao - b.posicao),
    total_negocios: contagemPorPipeline.get(p.id) ?? 0,
  }));

  return NextResponse.json({ pipelines: resultado });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as CreatePipelineBody;
  const { tenant_id, nome } = body;
  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  if (!nome?.trim()) return NextResponse.json({ error: "nome required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAdmin(request, tenant_id);
  if (!auth.ok) return auth.response;

  const { data: pipeline, error } = await auth.admin
    .from("pipelines")
    .insert({ tenant_id, nome: nome.trim(), is_default: false })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const pipelineId = (pipeline as { id: string }).id;
  await auth.admin.from("pipeline_etapas").insert({ pipeline_id: pipelineId, nome: "Novo", posicao: 0 });

  return NextResponse.json({ pipeline });
}
