import { NextRequest, NextResponse } from "next/server";
import { assertTenantMember } from "@/lib/auth/guard";
import { invalidateTenantOperationalConfig } from "@/lib/tenant-config";

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await assertTenantMember(tenantId);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.admin
    .from("tenants")
    .select("auto_close_inatividade_ativo, auto_close_inatividade_minutos")
    .eq("id", tenantId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? { auto_close_inatividade_ativo: true, auto_close_inatividade_minutos: 5 });
}

interface PatchBody {
  tenant_id?: string;
  ativo?: boolean;
  minutos?: number;
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as PatchBody;
  const { tenant_id, ativo, minutos } = body;
  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await assertTenantMember(tenant_id);
  if (!auth.ok) return auth.response;

  const updates: Record<string, unknown> = {};
  if (ativo !== undefined) updates.auto_close_inatividade_ativo = ativo;
  if (minutos !== undefined) updates.auto_close_inatividade_minutos = minutos;

  if (Object.keys(updates).length === 0) return NextResponse.json({ success: true });

  const { error } = await auth.admin.from("tenants").update(updates).eq("id", tenant_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await invalidateTenantOperationalConfig(tenant_id);

  return NextResponse.json({ success: true });
}
