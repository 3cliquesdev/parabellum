import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/auth/guard";
import { isInternalRequest } from "@/lib/security/internal-auth";
import { estaDentroDoHorarioComercial } from "@/lib/horario-comercial";
import { getTenantOperationalConfig } from "@/lib/tenant-config";

interface ConversaRow {
  id: string;
  tenant_id: string;
  lead_id: string;
  orchestration_context: Record<string, unknown> | null;
}

// Resolve tenant_id/lead_id a partir do conversa_id, com autoridade do
// servidor - usado pelos sub-workflows de agente especialista (n8n) pra
// nunca precisar confiar no que o LLM digitar como tenant_id/lead_id.
// So o conversa_id (um valor estavel, ja conhecido pelo agente supervisor)
// precisa passar pela "digitacao" do modelo; os outros dois IDs sao
// derivados aqui, nunca aceitos como input.
export async function GET(request: NextRequest) {
  if (!isInternalRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversaId = request.nextUrl.searchParams.get("conversa_id");
  if (!conversaId) return NextResponse.json({ found: false, error: "conversa_id required" }, { status: 400 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("conversas")
    .select("id, tenant_id, lead_id, orchestration_context")
    .eq("id", conversaId)
    .maybeSingle();

  if (!data) return NextResponse.json({ found: false, error: "Conversa nao encontrada" }, { status: 404 });

  const conversa = data as unknown as ConversaRow;

  // Pra IA poder avisar proativamente ("nosso atendimento humano funciona
  // das X as Y") em vez de so descobrir isso depois de tentar transferir e
  // levar fora_do_horario:true na resposta da ferramenta.
  const horario = await getTenantOperationalConfig(admin, conversa.tenant_id);

  return NextResponse.json({
    found: true,
    tenant_id: conversa.tenant_id,
    lead_id: conversa.lead_id,
    conversa_id: conversa.id,
    orchestration_context: conversa.orchestration_context ?? {},
    dentro_do_horario_comercial: estaDentroDoHorarioComercial(horario),
    horario_atendimento_inicio: horario.horario_atendimento_inicio,
    horario_atendimento_fim: horario.horario_atendimento_fim,
  });
}

// Atualizacao exclusiva do orquestrador n8n. O contexto nao e dado do cliente
// e nunca sai desta rota para interfaces publicas.
export async function POST(request: NextRequest) {
  if (!isInternalRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as { conversa_id?: string; orchestration_context?: unknown };
  if (!body.conversa_id || !body.orchestration_context || typeof body.orchestration_context !== "object" || Array.isArray(body.orchestration_context)) {
    return NextResponse.json({ error: "conversa_id e orchestration_context sao obrigatorios" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("conversas")
    .update({ orchestration_context: body.orchestration_context as Record<string, unknown> })
    .eq("id", body.conversa_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
