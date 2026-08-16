import { NextRequest, NextResponse } from "next/server";
import { assertTenantAdmin, assertTenantMember } from "@/lib/auth/guard";

interface UpdateNumeroBody {
  tenant_id?: string;
  id?: string;
  apelido?: string | null;
  dedicado_para_user_id?: string | null;
  ia_ativa_padrao?: boolean;
}

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ numeros: [] });

  const auth = await assertTenantMember(tenantId);
  if (!auth.ok) return NextResponse.json({ numeros: [] });

  const { data } = await auth.admin
    .from("whatsapp_configs")
    .select("id, phone_number_id, apelido, active, dedicado_para_user_id, ia_ativa_padrao, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ numeros: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as UpdateNumeroBody;
  const { tenant_id, id } = body;
  if (!tenant_id || !id) return NextResponse.json({ error: "tenant_id e id sao obrigatorios" }, { status: 400 });

  const auth = await assertTenantAdmin(tenant_id);
  if (!auth.ok) return auth.response;

  const updates: Record<string, unknown> = {};
  if (body.apelido !== undefined) updates.apelido = body.apelido;
  if (body.dedicado_para_user_id !== undefined) updates.dedicado_para_user_id = body.dedicado_para_user_id;
  if (body.ia_ativa_padrao !== undefined) updates.ia_ativa_padrao = body.ia_ativa_padrao;

  const { error } = await auth.admin
    .from("whatsapp_configs")
    .update(updates)
    .eq("id", id)
    .eq("tenant_id", tenant_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
