import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";
import { escolherVendedorMenosCarregado } from "@/lib/negocios/distribuicao";
import { resolvePipelinePadrao } from "@/lib/negocios/pipeline-padrao";

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
    .select(`*,
      leads(nome, email, whatsapp, instagram, cpf, endereco_rua, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep, servico_interesse, observacoes, eh_cliente),
      vendas(external_id, produto_nome, valor, paid_at, tipo_cobranca)`)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (leadId) query = query.eq("lead_id", leadId);
  if (pipelineId) query = query.eq("pipeline_id", pipelineId);

  // Situacao de pagamento (carrinho abandonado/cartao recusado/aguardando
  // pagamento) - mesma logica que ja existia em useLeads.ts pro Pipeline
  // antigo; some do card quando o lead ja e cliente. Roda em paralelo com a
  // query principal - as duas sao independentes, nao ha motivo pra esperar
  // uma terminar pra comecar a outra.
  const [{ data, error }, { data: vendasPendentes }] = await Promise.all([
    query,
    auth.admin
      .from("vendas")
      .select("lead_id, status, created_at")
      .eq("tenant_id", tenantId)
      .in("status", ["carrinho_abandonado", "cartao_recusado", "aguardando_pagamento"])
      .not("lead_id", "is", null)
      .order("created_at", { ascending: false }),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const negocios = (data ?? []) as unknown as { id: string; lead_id: string; leads?: { eh_cliente?: boolean } | null }[];

  const situacaoPorLead = new Map<string, string>();
  for (const venda of (vendasPendentes ?? []) as unknown as { lead_id: string; status: string }[]) {
    if (!situacaoPorLead.has(venda.lead_id)) situacaoPorLead.set(venda.lead_id, venda.status);
  }

  const resultado = negocios.map((n) => ({
    ...n,
    situacao_pagamento: n.leads?.eh_cliente ? null : (situacaoPorLead.get(n.lead_id) ?? null),
  }));

  return NextResponse.json({ negocios: resultado });
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

  // Se ninguem foi explicitamente escolhido, tenta auto-atribuir pelo
  // round-robin de menor carga da equipe do pipeline (fica null se o
  // pipeline nao tem equipe configurada - cai na fila de distribuicao).
  let assignedTo = body.assigned_to ?? null;
  if (!assignedTo && pipelineId) {
    assignedTo = await escolherVendedorMenosCarregado(auth.admin, pipelineId);
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
      assigned_to: assignedTo,
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
