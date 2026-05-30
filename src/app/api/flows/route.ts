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
  if (!tenantId) return NextResponse.json({ flows: [] });
  const { data } = await admin.from("chat_flows").select("*").eq("tenant_id", tenantId).order("prioridade", { ascending: false });
  return NextResponse.json({ flows: data ?? [] });
}

export async function POST(request: NextRequest) {
  const { auth, admin } = await clients(request);
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenant_id, nome, descricao, trigger_keywords, departamento, flow_definition } = await request.json();
  if (!tenant_id || !nome) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const { data, error } = await admin.from("chat_flows").insert({
    tenant_id, nome, descricao, trigger_keywords: trigger_keywords ?? [],
    departamento: departamento ?? "todos",
    flow_definition: flow_definition ?? { nodes: [{ id: "start-1", type: "start", position: { x: 100, y: 100 }, data: { label: "Início" } }], edges: [] },
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ flow: data });
}

export async function PATCH(request: NextRequest) {
  const { auth, admin } = await clients(request);
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { flow_id, ...updates } = await request.json();
  await admin.from("chat_flows").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", flow_id);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { auth, admin } = await clients(request);
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { flow_id } = await request.json();
  await admin.from("chat_flows").delete().eq("id", flow_id);
  return NextResponse.json({ success: true });
}
