import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";

interface ConversaInativaRow {
  id: string;
  lead_id: string | null;
  ia_ultimo_departamento: string | null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;

  const { data: tenantConfig } = await auth.admin
    .from("tenants")
    .select("auto_close_inatividade_ativo, auto_close_inatividade_minutos")
    .eq("id", tenantId)
    .maybeSingle();
  const config = tenantConfig as { auto_close_inatividade_ativo: boolean; auto_close_inatividade_minutos: number } | null;

  if (!config || !config.auto_close_inatividade_ativo) {
    return NextResponse.json({ conversas: [] });
  }

  const limite = new Date(Date.now() - config.auto_close_inatividade_minutos * 60 * 1000).toISOString();

  const { data, error } = await auth.admin
    .from("conversas")
    .select("id, lead_id, ia_ultimo_departamento")
    .eq("tenant_id", tenantId)
    .eq("status", "ativo")
    .eq("ia_ativa", true)
    .eq("aguardando_csat", false)
    .is("timeout_disparado_em", null)
    .not("ultima_resposta_ia_em", "is", null)
    .lt("ultima_resposta_ia_em", limite)
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const conversas = (data ?? []) as ConversaInativaRow[];
  if (conversas.length === 0) return NextResponse.json({ conversas: [] });

  await auth.admin
    .from("conversas")
    .update({ timeout_disparado_em: new Date().toISOString() })
    .in("id", conversas.map((c) => c.id));

  return NextResponse.json({
    conversas: conversas.map((c) => ({
      conversa_id: c.id,
      lead_id: c.lead_id,
      departamento: c.ia_ultimo_departamento ?? "geral",
    })),
  });
}
