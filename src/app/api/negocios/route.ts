import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";
import type { AdminClient } from "@/lib/auth/guard";

interface CreateNegocioBody {
  tenant_id?: string;
  lead_id?: string;
  conversa_id?: string;
  titulo?: string;
  valor?: number | null;
  estagio?: "aberto" | "ganho" | "perdido";
  origem?: string;
  assigned_to?: string | null;
  pipeline_id?: string | null;
  pipeline_etapa_id?: string | null;
}

// Quando quem cria o negocio nao escolhe pipeline/etapa (ex: criacao manual
// pelo Inbox), cai no pipeline padrao do tenant + primeira etapa dele -
// nunca fica sem pipeline.
async function resolvePipelinePadrao(admin: AdminClient, tenantId: string) {
  const { data: pipeline } = await admin
    .from("pipelines")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("is_default", true)
    .maybeSingle();
  if (!pipeline) return { pipelineId: null, etapaId: null };

  const { data: etapa } = await admin
    .from("pipeline_etapas")
    .select("id")
    .eq("pipeline_id", (pipeline as { id: string }).id)
    .order("posicao", { ascending: true })
    .limit(1)
    .maybeSingle();

  return { pipelineId: (pipeline as { id: string }).id, etapaId: (etapa as { id: string } | null)?.id ?? null };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;

  const leadId = searchParams.get("lead_id");
  const pipelineId = searchParams.get("pipeline_id");

  let query = auth.admin
    .from("negocios")
    .select("*, leads(nome)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (leadId) query = query.eq("lead_id", leadId);
  if (pipelineId) query = query.eq("pipeline_id", pipelineId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ negocios: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as CreateNegocioBody;
  const { tenant_id, lead_id, titulo } = body;
  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  if (!lead_id) return NextResponse.json({ error: "lead_id required" }, { status: 400 });
  if (!titulo) return NextResponse.json({ error: "titulo required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenant_id);
  if (!auth.ok) return auth.response;

  const { data: lead } = await auth.admin
    .from("leads")
    .select("id")
    .eq("id", lead_id)
    .eq("tenant_id", tenant_id)
    .maybeSingle();
  if (!lead) return NextResponse.json({ error: "lead nao encontrado" }, { status: 404 });

  let canal: string | null = null;
  if (body.conversa_id) {
    const { data: conversa } = await auth.admin
      .from("conversas")
      .select("canal")
      .eq("id", body.conversa_id)
      .eq("tenant_id", tenant_id)
      .maybeSingle();
    canal = (conversa as { canal?: string } | null)?.canal ?? null;
  }

  let pipelineId = body.pipeline_id ?? null;
  let pipelineEtapaId = body.pipeline_etapa_id ?? null;
  if (!pipelineId) {
    const padrao = await resolvePipelinePadrao(auth.admin, tenant_id);
    pipelineId = padrao.pipelineId;
    pipelineEtapaId = padrao.etapaId;
  }

  const { data, error } = await auth.admin
    .from("negocios")
    .insert({
      tenant_id,
      lead_id,
      conversa_id: body.conversa_id ?? null,
      canal,
      titulo,
      valor: body.valor ?? null,
      estagio: body.estagio ?? "aberto",
      origem: body.origem ?? "manual",
      assigned_to: body.assigned_to ?? null,
      pipeline_id: pipelineId,
      pipeline_etapa_id: pipelineEtapaId,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.valor != null) {
    await auth.admin.from("leads").update({ valor_estimado: body.valor }).eq("id", lead_id);
  }

  return NextResponse.json({ negocio: data });
}
