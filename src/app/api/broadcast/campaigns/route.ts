import { NextRequest, NextResponse } from "next/server";
import { assertTenantMember } from "@/lib/auth/guard";

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ campaigns: [] });
  const auth = await assertTenantMember(tenantId);
  if (!auth.ok) return auth.response;
  const { data } = await auth.admin.from("broadcast_campaigns").select("*, meta_templates(template_name, category, status)").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  return NextResponse.json({ campaigns: data ?? [] });
}

export async function POST(request: NextRequest) {
  const { tenant_id, nome, descricao, template_id, template_variables, segmento_filtros } = await request.json();
  if (!tenant_id || !nome || !template_id) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const auth = await assertTenantMember(tenant_id);
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.admin.from("broadcast_campaigns").insert({
    tenant_id, created_by: auth.user.id, nome, descricao, template_id,
    template_variables: template_variables ?? {}, segmento_filtros: segmento_filtros ?? {},
    status: "rascunho",
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign: data });
}
