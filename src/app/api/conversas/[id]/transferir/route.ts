import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";
import { dispatchConversation } from "@/lib/dispatch";
import { estaDentroDoHorarioComercial } from "@/lib/horario-comercial";
import { getTenantOperationalConfig } from "@/lib/tenant-config";

interface TransferirBody {
  tenant_id?: string;
  departamento_slug?: string;
  motivo?: string;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: conversaId } = await params;
  const body = (await request.json().catch(() => ({}))) as TransferirBody;
  const { tenant_id, departamento_slug, motivo } = body;

  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  if (!departamento_slug) return NextResponse.json({ error: "departamento_slug required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenant_id);
  if (!auth.ok) return auth.response;

  const { data: dept } = await auth.admin
    .from("departments")
    .select("id, name")
    .eq("tenant_id", tenant_id)
    .eq("slug", departamento_slug)
    .eq("is_active", true)
    .maybeSingle();

  const departamento = dept as { id: string; name: string } | null;
  if (!departamento) {
    return NextResponse.json({ error: `departamento_slug '${departamento_slug}' nao existe para este tenant` }, { status: 400 });
  }

  const { data: conversa } = await auth.admin.from("conversas").select("id").eq("id", conversaId).eq("tenant_id", tenant_id).maybeSingle();
  if (!conversa) return NextResponse.json({ error: "conversa nao encontrada" }, { status: 404 });

  const horarioConfig = await getTenantOperationalConfig(auth.admin, tenant_id);

  if (!estaDentroDoHorarioComercial(horarioConfig)) {
    return NextResponse.json({
      transferido: false,
      fora_do_horario: true,
      horario_atendimento_inicio: horarioConfig.horario_atendimento_inicio,
      horario_atendimento_fim: horarioConfig.horario_atendimento_fim,
    });
  }

  const resultado = await dispatchConversation(tenant_id, conversaId, departamento.id, motivo ?? "transferencia_ia", undefined, 1, auth.userId ?? null);

  if (resultado.conflito) {
    return NextResponse.json(
      { error: "Essa conversa foi alterada por outra ação simultânea (resolvida ou transferida). Atualize e tente novamente.", conflito: true },
      { status: 409 },
    );
  }

  return NextResponse.json({ ...resultado, departamento: departamento.name });
}
