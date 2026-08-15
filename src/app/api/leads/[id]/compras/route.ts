import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/auth/guard";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";

interface VendaRow {
  produto_nome: string;
  valor: string | number;
  status: string;
  tipo_produto: string;
  origem: string;
  created_at: string;
  paid_at: string | null;
}

async function getLeadTenantId(leadId: string): Promise<string | null> {
  const { data } = await createAdminClient().from("leads").select("tenant_id").eq("id", leadId).maybeSingle();
  return (data as { tenant_id?: string } | null)?.tenant_id ?? null;
}

// Rotula a origem de forma explicita pro agente de IA nao confundir
// "cade meu curso" (produto digital, Kiwify) com "cade minha entrega"
// (pedido fisico, fonte de dados futura e separada).
function labelOrigem(origem: string, tipoProduto: string): string {
  if (origem === "kiwify") {
    return tipoProduto === "assinatura" ? "assinatura_digital_kiwify" : "curso_digital_kiwify";
  }
  if (origem === "pedido_fisico") return "produto_fisico";
  return `outro:${origem}`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await params;
  const tenantId = await getLeadTenantId(leadId);
  if (!tenantId) return NextResponse.json({ found: false, error: "Lead nao encontrado" }, { status: 404 });

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.admin
    .from("vendas")
    .select("produto_nome, valor, status, tipo_produto, origem, created_at, paid_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as unknown as VendaRow[];
  return NextResponse.json({
    found: rows.length > 0,
    compras: rows.map((r) => ({
      produto: r.produto_nome,
      valor: Number(r.valor),
      status: r.status,
      categoria: labelOrigem(r.origem, r.tipo_produto),
      comprado_em: r.created_at,
      pago_em: r.paid_at,
    })),
    _grounding: { source: "vendas", fetched_at: new Date().toISOString() },
  });
}
