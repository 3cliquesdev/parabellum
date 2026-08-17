import { NextRequest, NextResponse } from "next/server";
import { assertTenantMember, assertTenantAdmin } from "@/lib/auth/guard";

interface CreateAgenteBody {
  tenant_id?: string;
  papel?: string;
  nome?: string;
  persona?: string;
  modelo?: string;
  temperatura?: number;
}

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  const auth = await assertTenantMember(tenantId);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.admin
    .from("ia_agentes")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("papel", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ agentes: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as CreateAgenteBody;
  const { tenant_id, nome, persona } = body;
  if (!tenant_id || !nome) return NextResponse.json({ error: "tenant_id e nome sao obrigatorios" }, { status: 400 });

  const auth = await assertTenantAdmin(tenant_id);
  if (!auth.ok) return auth.response;

  // Agentes novos criados pela tela sao sempre "personalizado" - os 4
  // papeis fixos (vendas/suporte/financeiro/geral) ja existem, mapeados
  // aos nos do n8n, e so podem ser editados via PATCH, nunca recriados.
  const { data, error } = await auth.admin
    .from("ia_agentes")
    .insert({
      tenant_id,
      papel: "personalizado",
      nome,
      persona: persona ?? "",
      modelo: body.modelo ?? "gpt-4o-mini",
      temperatura: body.temperatura ?? 0.7,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ agente: data });
}
