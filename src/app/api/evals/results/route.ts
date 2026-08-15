import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";

interface SaveResultBody {
  tenant_id?: string;
  case_id?: string;
  resposta_obtida?: string;
  passou?: boolean;
  nota?: number;
  justificativa?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  const limit = Math.min(Number(searchParams.get("limit") ?? "50") || 50, 200);
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.admin
    .from("ai_eval_results")
    .select("*, ai_eval_cases(categoria, pergunta)")
    .eq("tenant_id", tenantId)
    .order("executed_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ results: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as SaveResultBody;
  const { tenant_id, case_id, passou } = body;
  if (!tenant_id || !case_id || typeof passou !== "boolean") {
    return NextResponse.json({ error: "tenant_id, case_id e passou sao obrigatorios" }, { status: 400 });
  }

  const auth = await resolveInternalOrTenantAuth(request, tenant_id);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.admin
    .from("ai_eval_results")
    .insert({
      tenant_id,
      case_id,
      resposta_obtida: body.resposta_obtida ?? null,
      passou,
      nota: body.nota ?? null,
      justificativa: body.justificativa ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ result: data });
}
