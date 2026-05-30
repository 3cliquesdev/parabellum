import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function clients(request: NextRequest) {
  const cookieStore = await cookies();
  const auth = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
  return { auth, admin };
}

export async function GET(request: NextRequest) {
  const { auth, admin } = await clients(request);
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = request.nextUrl.searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ templates: [] });
  const { data } = await admin.from("meta_templates").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(request: NextRequest) {
  const { auth, admin } = await clients(request);
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { tenant_id, template_name, category, body_text, header_type, header_text, footer_text, buttons, variables_schema, language_code } = body;
  if (!tenant_id || !template_name || !category || !body_text) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const vars = (body_text.match(/\{\{\d+\}\}/g) ?? []).length;
  const { data, error } = await admin.from("meta_templates").insert({
    tenant_id, template_name, category, body_text, language_code: language_code ?? "pt_BR",
    header_type: header_type ?? "NONE", header_text, footer_text,
    buttons: buttons ?? [], variables_count: vars, variables_schema: variables_schema ?? [],
    status: "pending",
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}

export async function PATCH(request: NextRequest) {
  const { auth, admin } = await clients(request);
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { template_id, status, meta_template_id, rejection_reason } = await request.json();
  await admin.from("meta_templates").update({ status, meta_template_id, rejection_reason, updated_at: new Date().toISOString() }).eq("id", template_id);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { auth, admin } = await clients(request);
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { template_id } = await request.json();
  await admin.from("meta_templates").delete().eq("id", template_id);
  return NextResponse.json({ success: true });
}
