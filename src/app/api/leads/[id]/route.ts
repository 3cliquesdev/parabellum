import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/auth/guard";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";

interface LeadRow {
  id: string;
  tenant_id: string;
  nome: string;
  whatsapp: string | null;
  email: string | null;
  status: string;
  observacoes: string | null;
  valor_estimado: number | null;
  created_at: string;
  updated_at: string;
}

async function getLeadTenantId(leadId: string): Promise<string | null> {
  const { data } = await createAdminClient().from("leads").select("tenant_id").eq("id", leadId).maybeSingle();
  return (data as { tenant_id?: string } | null)?.tenant_id ?? null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await getLeadTenantId(id);
  if (!tenantId) return NextResponse.json({ found: false, error: "Lead nao encontrado" }, { status: 404 });

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.admin
    .from("leads")
    .select("id, tenant_id, nome, whatsapp, email, status, observacoes, valor_estimado, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ found: false, error: "Lead nao encontrado" }, { status: 404 });

  const lead = data as unknown as LeadRow;
  return NextResponse.json({
    found: true,
    lead: {
      nome: lead.nome,
      status: lead.status,
      observacoes: lead.observacoes,
      valor_estimado: lead.valor_estimado,
      cliente_desde: lead.created_at,
    },
    _grounding: { source: "leads", ref_id: lead.id, fetched_at: new Date().toISOString() },
  });
}
