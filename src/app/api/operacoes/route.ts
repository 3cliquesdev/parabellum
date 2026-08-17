import { NextRequest, NextResponse } from "next/server";
import { assertTenantMember, assertTenantAdmin } from "@/lib/auth/guard";

interface CreateOperacaoBody {
  tenant_id?: string;
  nome?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await assertTenantMember(tenantId);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.admin
    .from("operacoes")
    .select("id, nome, ativo")
    .eq("tenant_id", tenantId)
    .eq("ativo", true)
    .order("nome");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ operacoes: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as CreateOperacaoBody;
  const { tenant_id, nome } = body;
  if (!tenant_id || !nome) return NextResponse.json({ error: "tenant_id e nome sao obrigatorios" }, { status: 400 });

  const auth = await assertTenantAdmin(tenant_id);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.admin
    .from("operacoes")
    .insert({ tenant_id, nome })
    .select("id, nome, ativo")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ operacao: data });
}
