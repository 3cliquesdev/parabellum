import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";
import { assignConversationToUser, dispatchConversation } from "@/lib/dispatch";
import { estaDentroDoHorarioComercial } from "@/lib/horario-comercial";
import { getTenantOperationalConfig } from "@/lib/tenant-config";

interface TransferirBody {
  tenant_id?: string;
  departamento_slug?: string;
  user_id?: string;
  motivo?: string;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: conversaId } = await params;
  const body = (await request.json().catch(() => ({}))) as TransferirBody;
  const { tenant_id, departamento_slug, user_id, motivo } = body;

  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  if (!departamento_slug && !user_id) return NextResponse.json({ error: "departamento_slug ou user_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenant_id);
  if (!auth.ok) return auth.response;

  const { data: conversa } = await auth.admin.from("conversas").select("id").eq("id", conversaId).eq("tenant_id", tenant_id).maybeSingle();
  if (!conversa) return NextResponse.json({ error: "conversa nao encontrada" }, { status: 404 });

  let departamento: { id: string; name: string } | null = null;
  if (departamento_slug) {
    const { data: dept } = await auth.admin
      .from("departments")
      .select("id, name")
      .eq("tenant_id", tenant_id)
      .eq("slug", departamento_slug)
      .eq("is_active", true)
      .maybeSingle();

    departamento = dept as { id: string; name: string } | null;
    if (!departamento) {
      return NextResponse.json({ error: `departamento_slug '${departamento_slug}' nao existe para este tenant` }, { status: 400 });
    }
  }

  // Transferencia direta pra uma pessoa e uma decisao humana explicita, nao
  // round-robin automatico - nao faz sentido bloquear por horario comercial
  // (isso so protege contra a IA/automacao acordar um agente fora de escala).
  if (user_id) {
    const resultado = await assignConversationToUser(tenant_id, conversaId, user_id, departamento?.id, motivo ?? "transferencia_manual", auth.userId ?? null);

    if (resultado.conflito) {
      return NextResponse.json(
        { error: "Essa conversa foi alterada por outra ação simultânea (resolvida ou transferida). Atualize e tente novamente.", conflito: true },
        { status: 409 },
      );
    }

    return NextResponse.json({ ...resultado, departamento: departamento?.name });
  }

  const horarioConfig = await getTenantOperationalConfig(auth.admin, tenant_id);

  if (!estaDentroDoHorarioComercial(horarioConfig)) {
    return NextResponse.json({
      transferido: false,
      fora_do_horario: true,
      horario_atendimento_inicio: horarioConfig.horario_atendimento_inicio,
      horario_atendimento_fim: horarioConfig.horario_atendimento_fim,
    });
  }

  const resultado = await dispatchConversation(tenant_id, conversaId, departamento!.id, motivo ?? "transferencia_ia", undefined, 1, auth.userId ?? null);

  if (resultado.conflito) {
    return NextResponse.json(
      { error: "Essa conversa foi alterada por outra ação simultânea (resolvida ou transferida). Atualize e tente novamente.", conflito: true },
      { status: 409 },
    );
  }

  return NextResponse.json({ ...resultado, departamento: departamento!.name });
}
