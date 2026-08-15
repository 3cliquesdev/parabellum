import { NextRequest, NextResponse } from "next/server";
import { isInternalRequest } from "@/lib/security/internal-auth";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";
import { logAiDecision } from "@/lib/security/ai-audit";
import { isUuid } from "@/lib/security/validate";

interface CreateDevolucaoBody {
  tenant_id?: string;
  lead_id?: string | null;
  external_order_id?: string | null;
  tracking_code_original?: string | null;
  tracking_code_return?: string | null;
  motivo?: string | null;
  descricao?: string | null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  const leadId = searchParams.get("lead_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;

  let query = auth.admin
    .from("devolucoes")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (leadId) query = query.eq("lead_id", leadId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ found: (data ?? []).length > 0, devolucoes: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as CreateDevolucaoBody;
  const { tenant_id } = body;
  if (!isUuid(tenant_id)) return NextResponse.json({ error: "tenant_id invalido: deve ser um UUID valido, copiado do CONTEXTO INTERNO" }, { status: 400 });
  if (body.lead_id != null && !isUuid(body.lead_id)) {
    return NextResponse.json({ error: "lead_id invalido: deve ser um UUID valido, copiado do CONTEXTO INTERNO" }, { status: 400 });
  }

  const auth = await resolveInternalOrTenantAuth(request, tenant_id);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.admin
    .from("devolucoes")
    .insert({
      tenant_id,
      lead_id: body.lead_id ?? null,
      external_order_id: body.external_order_id ?? null,
      tracking_code_original: body.tracking_code_original ?? null,
      tracking_code_return: body.tracking_code_return ?? null,
      motivo: body.motivo ?? null,
      descricao: body.descricao ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (isInternalRequest(request) && data) {
    const devolucao = data as unknown as { id: string };
    await logAiDecision(auth.admin, {
      tenantId: tenant_id,
      leadId: body.lead_id,
      acao: "criar_devolucao",
      detalhes: { devolucao_id: devolucao.id, external_order_id: body.external_order_id, motivo: body.motivo },
    });
  }

  return NextResponse.json({ devolucao: data });
}
