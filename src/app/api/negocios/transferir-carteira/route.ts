import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";

interface TransferirBody {
  tenant_id?: string;
  de_user_id?: string;
  para_user_id?: string;
  pipeline_id?: string | null;
}

// Preview: quantos negocios abertos e quanto valor seriam transferidos, sem
// alterar nada ainda - mostrado antes do usuario confirmar.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  const deUserId = searchParams.get("de_user_id");
  const pipelineId = searchParams.get("pipeline_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  if (!deUserId) return NextResponse.json({ error: "de_user_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;

  let query = auth.admin
    .from("negocios")
    .select("valor")
    .eq("tenant_id", tenantId)
    .eq("assigned_to", deUserId)
    .eq("estagio", "aberto");
  if (pipelineId) query = query.eq("pipeline_id", pipelineId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as { valor: number | null }[];
  const total = rows.reduce((s, r) => s + Number(r.valor ?? 0), 0);

  return NextResponse.json({ quantidade: rows.length, valor_total: total });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as TransferirBody;
  const { tenant_id, de_user_id, para_user_id, pipeline_id } = body;
  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  if (!de_user_id) return NextResponse.json({ error: "de_user_id required" }, { status: 400 });
  if (!para_user_id) return NextResponse.json({ error: "para_user_id required" }, { status: 400 });
  if (de_user_id === para_user_id) return NextResponse.json({ error: "vendedor de origem e destino sao o mesmo" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenant_id);
  if (!auth.ok) return auth.response;

  let query = auth.admin
    .from("negocios")
    .update({ assigned_to: para_user_id, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenant_id)
    .eq("assigned_to", de_user_id)
    .eq("estagio", "aberto");
  if (pipeline_id) query = query.eq("pipeline_id", pipeline_id);

  const { data, error } = await query.select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, transferidos: (data ?? []).length });
}
