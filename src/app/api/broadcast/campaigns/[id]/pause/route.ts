import { NextRequest, NextResponse } from "next/server";
import { assertTenantMember, createAdminClient } from "@/lib/auth/guard";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const { data: campaign } = await createAdminClient()
    .from("broadcast_campaigns")
    .select("tenant_id")
    .eq("id", id)
    .maybeSingle();
  const tenantId = (campaign as { tenant_id?: string } | null)?.tenant_id ?? null;

  const auth = await assertTenantMember(tenantId);
  if (!auth.ok) return auth.response;
  const admin = auth.admin;
  const { motivo } = await request.json().catch(() => ({}));

  await admin.from("broadcast_campaigns").update({
    status: "pausado", pausado_em: new Date().toISOString(),
    pausado_motivo: motivo ?? "Pausado manualmente", updated_at: new Date().toISOString(),
  }).eq("id", id);

  return NextResponse.json({ success: true });
}
