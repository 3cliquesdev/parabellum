import { NextRequest, NextResponse } from "next/server";
import {
  assertTenantAdmin,
  assertTenantMember,
  createAdminClient,
} from "@/lib/auth/guard";

async function getTemplateTenantId(templateId: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("meta_templates")
    .select("tenant_id")
    .eq("id", templateId)
    .maybeSingle();
  return (data as { tenant_id?: string } | null)?.tenant_id ?? null;
}

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ templates: [] });
  const auth = await assertTenantMember(tenantId);
  if (!auth.ok) return auth.response;
  const { data } = await auth.admin.from("meta_templates").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { tenant_id, template_name, category, body_text, header_type, header_text, footer_text, buttons, variables_schema, language_code } = body;
  if (!tenant_id || !template_name || !category || !body_text) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const auth = await assertTenantAdmin(tenant_id);
  if (!auth.ok) return auth.response;
  const vars = (body_text.match(/\{\{\d+\}\}/g) ?? []).length;
  const { data, error } = await auth.admin.from("meta_templates").insert({
    tenant_id, template_name, category, body_text, language_code: language_code ?? "pt_BR",
    header_type: header_type ?? "NONE", header_text, footer_text,
    buttons: buttons ?? [], variables_count: vars, variables_schema: variables_schema ?? [],
    status: "pending",
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}

export async function PATCH(request: NextRequest) {
  const { template_id, status, meta_template_id, rejection_reason } = await request.json();
  if (!template_id) return NextResponse.json({ error: "template_id required" }, { status: 400 });
  const tenantId = await getTemplateTenantId(template_id);
  if (!tenantId) return NextResponse.json({ error: "Template nao encontrado" }, { status: 404 });
  const auth = await assertTenantAdmin(tenantId);
  if (!auth.ok) return auth.response;
  await auth.admin.from("meta_templates").update({ status, meta_template_id, rejection_reason, updated_at: new Date().toISOString() }).eq("id", template_id).eq("tenant_id", tenantId);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { template_id } = await request.json();
  if (!template_id) return NextResponse.json({ error: "template_id required" }, { status: 400 });
  const tenantId = await getTemplateTenantId(template_id);
  if (!tenantId) return NextResponse.json({ error: "Template nao encontrado" }, { status: 404 });
  const auth = await assertTenantAdmin(tenantId);
  if (!auth.ok) return auth.response;
  await auth.admin.from("meta_templates").delete().eq("id", template_id).eq("tenant_id", tenantId);
  return NextResponse.json({ success: true });
}
