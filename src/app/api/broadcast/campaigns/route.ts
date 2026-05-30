import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function clients(request: NextRequest) {
  const cookieStore = await cookies();
  const auth = createServerClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const admin = createServerClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { cookies: { getAll: () => [], setAll: () => {} } });
  return { auth, admin };
}

export async function GET(request: NextRequest) {
  const { auth, admin } = await clients(request);
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = request.nextUrl.searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ campaigns: [] });
  const { data } = await admin.from("broadcast_campaigns").select("*, meta_templates(template_name, category, status)").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  return NextResponse.json({ campaigns: data ?? [] });
}

export async function POST(request: NextRequest) {
  const { auth, admin } = await clients(request);
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenant_id, nome, descricao, template_id, template_variables, segmento_filtros } = await request.json();
  if (!tenant_id || !nome || !template_id) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const { data, error } = await admin.from("broadcast_campaigns").insert({
    tenant_id, created_by: user.id, nome, descricao, template_id,
    template_variables: template_variables ?? {}, segmento_filtros: segmento_filtros ?? {},
    status: "rascunho",
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign: data });
}
