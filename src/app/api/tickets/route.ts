import { NextRequest, NextResponse } from "next/server";
import { isInternalRequest } from "@/lib/security/internal-auth";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";
import { logAiDecision } from "@/lib/security/ai-audit";
import { isUuid } from "@/lib/security/validate";

interface CreateTicketBody {
  tenant_id?: string;
  titulo?: string;
  descricao?: string;
  categoria_id?: string | null;
  categoria_nome?: string | null;
  lead_id?: string | null;
  conversa_id?: string | null;
  prioridade?: "baixa" | "media" | "alta" | "urgente";
  canal_origem?: string;
  assigned_to?: string | null;
  created_by?: string | null;
  tag_ids?: string[];
}

const VERIFICACAO_RECENTE_MS = 2 * 60 * 60 * 1000; // 2h

const SLA_HOURS: Record<string, number> = { urgente: 4, alta: 8, media: 24, baixa: 48 };

function computeDueDate(prioridade: string): string {
  const hours = SLA_HOURS[prioridade] ?? SLA_HOURS.media;
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;

  const status = searchParams.get("status");
  const assignedTo = searchParams.get("assigned_to");
  const leadId = searchParams.get("lead_id");

  let query = auth.admin
    .from("tickets")
    .select("*, ticket_categories(nome, cor), ticket_tags(tags(id, nome, cor))")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (assignedTo) query = query.eq("assigned_to", assignedTo);
  if (leadId) query = query.eq("lead_id", leadId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tickets: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as CreateTicketBody;
  const { tenant_id, titulo } = body;
  if (!isUuid(tenant_id) || !titulo) {
    return NextResponse.json({ error: "tenant_id (UUID valido, copiado do CONTEXTO INTERNO) e titulo sao obrigatorios" }, { status: 400 });
  }
  if (body.lead_id != null && !isUuid(body.lead_id)) {
    return NextResponse.json({ error: "lead_id invalido: deve ser um UUID valido, copiado do CONTEXTO INTERNO" }, { status: 400 });
  }
  if (body.conversa_id != null && !isUuid(body.conversa_id)) {
    return NextResponse.json({ error: "conversa_id invalido: deve ser um UUID valido, copiado do CONTEXTO INTERNO" }, { status: 400 });
  }

  const auth = await resolveInternalOrTenantAuth(request, tenant_id);
  if (!auth.ok) return auth.response;

  let categoriaId = body.categoria_id ?? null;
  if (!categoriaId && body.categoria_nome) {
    const { data: categoria } = await auth.admin
      .from("ticket_categories")
      .select("id, requer_verificacao")
      .eq("tenant_id", tenant_id)
      .eq("nome", body.categoria_nome)
      .maybeSingle();
    categoriaId = (categoria as { id?: string } | null)?.id ?? null;
  }

  if (categoriaId) {
    const { data: categoria } = await auth.admin
      .from("ticket_categories")
      .select("requer_verificacao")
      .eq("id", categoriaId)
      .maybeSingle();
    const requerVerificacao = (categoria as { requer_verificacao?: boolean } | null)?.requer_verificacao ?? false;

    if (requerVerificacao && isInternalRequest(request)) {
      if (!isUuid(body.conversa_id)) {
        return NextResponse.json({ error: "conversa_id (UUID valido) e obrigatorio pra essa categoria de ticket" }, { status: 400 });
      }
      const { data: conversa } = await auth.admin
        .from("conversas")
        .select("financeiro_verificado_em")
        .eq("id", body.conversa_id)
        .eq("tenant_id", tenant_id)
        .maybeSingle();
      const verificadoEm = (conversa as { financeiro_verificado_em?: string | null } | null)?.financeiro_verificado_em;
      const recente = verificadoEm && Date.now() - new Date(verificadoEm).getTime() < VERIFICACAO_RECENTE_MS;
      if (!recente) {
        return NextResponse.json({ error: "Verificação de identidade (OTP) necessária antes de abrir esse tipo de ticket" }, { status: 403 });
      }
    }
  }

  const prioridade = body.prioridade ?? "media";
  const { data, error } = await auth.admin
    .from("tickets")
    .insert({
      tenant_id,
      titulo,
      descricao: body.descricao ?? null,
      categoria_id: categoriaId,
      lead_id: body.lead_id ?? null,
      conversa_id: body.conversa_id ?? null,
      prioridade,
      canal_origem: body.canal_origem ?? "manual",
      assigned_to: body.assigned_to ?? null,
      created_by: body.created_by ?? null,
      due_date: computeDueDate(prioridade),
    })
    .select("*, ticket_categories(nome, cor)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.tag_ids?.length && data) {
    await auth.admin
      .from("ticket_tags")
      .insert(body.tag_ids.map((tag_id) => ({ ticket_id: (data as unknown as { id: string }).id, tag_id })));
  }

  if (isInternalRequest(request) && data) {
    const ticket = data as unknown as { id: string; ticket_number: string };
    await logAiDecision(auth.admin, {
      tenantId: tenant_id,
      leadId: body.lead_id,
      conversaId: body.conversa_id,
      acao: "criar_ticket",
      detalhes: { ticket_id: ticket.id, ticket_number: ticket.ticket_number, titulo, prioridade },
    });
  }

  return NextResponse.json({ ticket: data });
}
