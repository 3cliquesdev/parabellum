import { NextRequest, NextResponse } from "next/server";
import { assertTenantMember, createAdminClient } from "@/lib/auth/guard";

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ flows: [] });
  const auth = await assertTenantMember(tenantId);
  if (!auth.ok) return auth.response;
  const { data } = await auth.admin.from("chat_flows").select("*").eq("tenant_id", tenantId).order("prioridade", { ascending: false });
  return NextResponse.json({ flows: data ?? [] });
}

export async function POST(request: NextRequest) {
  const { tenant_id, nome, descricao, trigger_keywords, departamento, flow_definition } = await request.json();
  if (!tenant_id || !nome) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const auth = await assertTenantMember(tenant_id);
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.admin.from("chat_flows").insert({
    tenant_id, nome, descricao, trigger_keywords: trigger_keywords ?? [],
    departamento: departamento ?? "todos",
    flow_definition: flow_definition ?? { nodes: [{ id: "start-1", type: "start", position: { x: 100, y: 100 }, data: { label: "Início" } }], edges: [] },
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ flow: data });
}

/** Carrega o tenant_id dono de um flow para validar a autorizacao antes de mutar. */
async function getFlowTenantId(flowId: string): Promise<string | null> {
  const { data } = await createAdminClient().from("chat_flows").select("tenant_id").eq("id", flowId).maybeSingle();
  return (data as { tenant_id?: string } | null)?.tenant_id ?? null;
}

export async function PATCH(request: NextRequest) {
  const { flow_id, ...updates } = await request.json();
  if (!flow_id) return NextResponse.json({ error: "flow_id required" }, { status: 400 });
  const tenantId = await getFlowTenantId(flow_id);
  const auth = await assertTenantMember(tenantId);
  if (!auth.ok) return auth.response;
  // Impede reatribuir o flow para outro tenant via body.
  delete (updates as Record<string, unknown>).tenant_id;
  await auth.admin.from("chat_flows").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", flow_id);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { flow_id } = await request.json();
  if (!flow_id) return NextResponse.json({ error: "flow_id required" }, { status: 400 });
  const tenantId = await getFlowTenantId(flow_id);
  const auth = await assertTenantMember(tenantId);
  if (!auth.ok) return auth.response;
  await auth.admin.from("chat_flows").delete().eq("id", flow_id);
  return NextResponse.json({ success: true });
}
