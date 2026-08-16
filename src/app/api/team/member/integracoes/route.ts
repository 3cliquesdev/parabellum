import { NextRequest, NextResponse } from "next/server";
import { assertIntegrationAccess } from "@/lib/auth/guard";

interface IntegracaoAcessoBody {
  tenant_id?: string;
  member_user_id?: string;
  integracao?: string;
  acesso_full?: boolean;
}

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ acessos: [] });

  const auth = await assertIntegrationAccess(tenantId, request.nextUrl.searchParams.get("integracao") ?? "whatsapp");
  if (!auth.ok) return NextResponse.json({ acessos: [] });

  const { data } = await auth.admin
    .from("integracao_acessos")
    .select("user_id, integracao, acesso_full")
    .eq("tenant_id", tenantId);

  return NextResponse.json({ acessos: data ?? [] });
}

// So concede/revoga acesso a uma integracao quem ja tem acesso a ela (ou o
// dono) - ninguem sem acesso consegue se auto-promover nem promover outro.
export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as IntegracaoAcessoBody;
  const { tenant_id, member_user_id, integracao, acesso_full } = body;
  if (!tenant_id || !member_user_id || !integracao || acesso_full === undefined) {
    return NextResponse.json({ error: "tenant_id, member_user_id, integracao e acesso_full sao obrigatorios" }, { status: 400 });
  }

  const auth = await assertIntegrationAccess(tenant_id, integracao);
  if (!auth.ok) return auth.response;

  const { error } = await auth.admin.from("integracao_acessos").upsert({
    tenant_id,
    user_id: member_user_id,
    integracao,
    acesso_full,
    updated_at: new Date().toISOString(),
  }, { onConflict: "tenant_id,user_id,integracao" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
