import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: pipelineId } = await params;
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.admin
    .from("pipeline_vendedores")
    .select("id, user_id")
    .eq("pipeline_id", pipelineId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vendedores: data ?? [] });
}

interface AddVendedorBody {
  tenant_id?: string;
  user_id?: string;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: pipelineId } = await params;
  const body = (await request.json().catch(() => ({}))) as AddVendedorBody;
  const { tenant_id, user_id } = body;
  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenant_id);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.admin
    .from("pipeline_vendedores")
    .upsert({ pipeline_id: pipelineId, user_id }, { onConflict: "pipeline_id,user_id" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vendedor: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: pipelineId } = await params;
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  const userId = searchParams.get("user_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;

  const { error } = await auth.admin
    .from("pipeline_vendedores")
    .delete()
    .eq("pipeline_id", pipelineId)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
