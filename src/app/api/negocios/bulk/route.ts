import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";

type Acao = "mover_pipeline" | "transferir_vendedor" | "marcar_perdido" | "excluir";

interface BulkBody {
  tenant_id?: string;
  acao?: Acao;
  ids?: string[];
  pipeline_id?: string;
  pipeline_etapa_id?: string;
  assigned_to?: string | null;
  motivo_perda?: string | null;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as BulkBody;
  const { tenant_id, acao, ids } = body;
  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  if (!acao) return NextResponse.json({ error: "acao required" }, { status: 400 });
  if (!ids?.length) return NextResponse.json({ error: "ids required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenant_id);
  if (!auth.ok) return auth.response;

  if (acao === "excluir") {
    const { error } = await auth.admin.from("negocios").delete().eq("tenant_id", tenant_id).in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, afetados: ids.length });
  }

  if (acao === "mover_pipeline") {
    if (!body.pipeline_id) return NextResponse.json({ error: "pipeline_id required" }, { status: 400 });

    let pipelineEtapaId = body.pipeline_etapa_id ?? null;
    if (!pipelineEtapaId) {
      const { data: primeiraEtapa } = await auth.admin
        .from("pipeline_etapas")
        .select("id")
        .eq("pipeline_id", body.pipeline_id)
        .order("posicao", { ascending: true })
        .limit(1)
        .maybeSingle();
      pipelineEtapaId = (primeiraEtapa as { id: string } | null)?.id ?? null;
    }

    const { error } = await auth.admin
      .from("negocios")
      .update({ pipeline_id: body.pipeline_id, pipeline_etapa_id: pipelineEtapaId, updated_at: new Date().toISOString() })
      .eq("tenant_id", tenant_id)
      .in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, afetados: ids.length });
  }

  if (acao === "transferir_vendedor") {
    if (body.assigned_to === undefined) return NextResponse.json({ error: "assigned_to required" }, { status: 400 });
    const { error } = await auth.admin
      .from("negocios")
      .update({ assigned_to: body.assigned_to, updated_at: new Date().toISOString() })
      .eq("tenant_id", tenant_id)
      .in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, afetados: ids.length });
  }

  if (acao === "marcar_perdido") {
    const { error } = await auth.admin
      .from("negocios")
      .update({
        estagio: "perdido",
        motivo_perda: body.motivo_perda ?? null,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenant_id)
      .in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, afetados: ids.length });
  }

  return NextResponse.json({ error: "acao invalida" }, { status: 400 });
}
