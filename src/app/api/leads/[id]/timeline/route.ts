import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/auth/guard";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";

interface TimelineEvent {
  tipo: "status" | "mensagem" | "atividade" | "ticket" | "venda" | "devolucao" | "conversa_encerrada" | "negocio_criado" | "conversa_evento";
  data: string;
  titulo: string;
  detalhe: string | null;
  conversa_id?: string;
}

async function getLeadTenantId(leadId: string): Promise<string | null> {
  const { data } = await createAdminClient().from("leads").select("tenant_id").eq("id", leadId).maybeSingle();
  return (data as { tenant_id?: string } | null)?.tenant_id ?? null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await params;
  const tenantId = await getLeadTenantId(leadId);
  if (!tenantId) return NextResponse.json({ error: "Lead nao encontrado" }, { status: 404 });

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;
  const admin = auth.admin;

  const [statusHistory, mensagens, atividades, tickets, vendas, devolucoes, conversasEncerradas, negocios, conversaEventos] = await Promise.all([
    admin.from("lead_status_history").select("status_de, status_para, created_at").eq("lead_id", leadId).order("created_at"),
    admin.from("mensagens").select("remetente, conteudo, created_at, conversa_id, conversas!inner(canal, lead_id)").eq("conversas.lead_id", leadId).order("created_at"),
    admin.from("atividades").select("tipo, titulo, descricao, created_at").eq("lead_id", leadId).order("created_at"),
    admin.from("tickets").select("ticket_number, titulo, status, created_at").eq("lead_id", leadId).order("created_at"),
    admin.from("vendas").select("produto_nome, valor, status, tipo_produto, created_at").eq("lead_id", leadId).order("created_at"),
    admin.from("devolucoes").select("external_order_id, motivo, status, created_at").eq("lead_id", leadId).order("created_at"),
    admin
      .from("conversas")
      .select("id, protocolo, canal, resolvido_por, resolvido_em, conversation_tags(tags(nome))")
      .eq("lead_id", leadId)
      .eq("status", "resolvido")
      .not("resolvido_em", "is", null)
      .order("resolvido_em"),
    admin.from("negocios").select("titulo, valor, canal, estagio, created_at").eq("lead_id", leadId).order("created_at"),
    admin
      .from("conversa_eventos")
      .select("id, conversa_id, tipo, user_id, department_id, criado_em, conversas!inner(protocolo, canal, lead_id)")
      .eq("conversas.lead_id", leadId)
      .order("criado_em"),
  ]);

  const events: TimelineEvent[] = [];

  const STATUS_LABEL: Record<string, string> = {
    novo: "Novo", em_contato: "Em Contato", qualificado: "Qualificado",
    proposta: "Proposta", negociacao: "Negociação", ganho: "Ganho", perdido: "Perdido",
  };

  for (const row of (statusHistory.data ?? []) as { status_de: string | null; status_para: string; created_at: string }[]) {
    events.push({
      tipo: "status",
      data: row.created_at,
      titulo: row.status_de ? "Mudou de status" : "Virou lead",
      detalhe: row.status_de
        ? `${STATUS_LABEL[row.status_de] ?? row.status_de} → ${STATUS_LABEL[row.status_para] ?? row.status_para}`
        : STATUS_LABEL[row.status_para] ?? row.status_para,
    });
  }

  for (const row of (mensagens.data ?? []) as unknown as { remetente: string; conteudo: string; created_at: string; conversas: { canal: string } | { canal: string }[] }[]) {
    const canal = Array.isArray(row.conversas) ? row.conversas[0]?.canal : row.conversas?.canal;
    events.push({
      tipo: "mensagem",
      data: row.created_at,
      titulo: `Mensagem (${canal ?? "?"}) — ${row.remetente}`,
      detalhe: row.conteudo,
    });
  }

  for (const row of (atividades.data ?? []) as { tipo: string; titulo: string; descricao: string | null; created_at: string }[]) {
    events.push({ tipo: "atividade", data: row.created_at, titulo: `Atividade: ${row.titulo}`, detalhe: row.descricao });
  }

  for (const row of (tickets.data ?? []) as { ticket_number: string; titulo: string; status: string; created_at: string }[]) {
    events.push({ tipo: "ticket", data: row.created_at, titulo: `Ticket ${row.ticket_number}: ${row.titulo}`, detalhe: `Status: ${row.status}` });
  }

  for (const row of (vendas.data ?? []) as { produto_nome: string; valor: number; status: string; tipo_produto: string; created_at: string }[]) {
    events.push({
      tipo: "venda",
      data: row.created_at,
      titulo: `${row.tipo_produto === "assinatura" ? "Assinatura" : "Curso"}: ${row.produto_nome}`,
      detalhe: `R$ ${row.valor.toFixed(2)} — ${row.status}`,
    });
  }

  for (const row of (devolucoes.data ?? []) as { external_order_id: string | null; motivo: string | null; status: string; created_at: string }[]) {
    events.push({
      tipo: "devolucao",
      data: row.created_at,
      titulo: `Devolução${row.external_order_id ? ` (pedido ${row.external_order_id})` : ""}`,
      detalhe: `${row.motivo ?? "Motivo não informado"} — ${row.status}`,
    });
  }

  for (const row of (conversasEncerradas.data ?? []) as unknown as {
    id: string;
    protocolo: number;
    canal: string;
    resolvido_por: string | null;
    resolvido_em: string;
    conversation_tags: { tags: { nome: string } | { nome: string }[] | null }[] | null;
  }[]) {
    const tagNomes = (row.conversation_tags ?? [])
      .flatMap((ct) => (Array.isArray(ct.tags) ? ct.tags : ct.tags ? [ct.tags] : []))
      .map((tag) => tag.nome);

    events.push({
      tipo: "conversa_encerrada",
      data: row.resolvido_em,
      titulo: `Conversa encerrada (${row.canal}, protocolo #${String(row.protocolo).padStart(4, "0")})`,
      detalhe: `Encerrada por ${row.resolvido_por === "ia" ? "IA" : "atendente"}${tagNomes.length > 0 ? ` — ${tagNomes.join(", ")}` : ""}`,
      conversa_id: row.id,
    });
  }

  for (const row of (negocios.data ?? []) as { titulo: string; valor: number | null; canal: string | null; estagio: string; created_at: string }[]) {
    events.push({
      tipo: "negocio_criado",
      data: row.created_at,
      titulo: `Negócio: ${row.titulo}`,
      detalhe: `${row.valor != null ? `R$ ${row.valor}` : "Sem valor"}${row.canal ? ` — via ${row.canal}` : ""} — ${row.estagio}`,
    });
  }

  const eventosRows = (conversaEventos.data ?? []) as unknown as Array<{
    id: string;
    conversa_id: string;
    tipo: "assumido" | "transferido" | "resolvido";
    user_id: string | null;
    department_id: string | null;
    criado_em: string;
    conversas: { protocolo: number; canal: string } | { protocolo: number; canal: string }[];
  }>;

  if (eventosRows.length > 0) {
    const userIds = [...new Set(eventosRows.map((r) => r.user_id).filter((id): id is string => Boolean(id)))];
    const departmentIds = [...new Set(eventosRows.map((r) => r.department_id).filter((id): id is string => Boolean(id)))];

    const [userEmails, departmentRows] = await Promise.all([
      Promise.all(userIds.map(async (id) => {
        const { data } = await admin.auth.admin.getUserById(id);
        return [id, data.user?.email ?? null] as const;
      })),
      departmentIds.length > 0
        ? admin.from("departments").select("id, name").in("id", departmentIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    ]);
    const emailById = new Map(userEmails);
    const deptNameById = new Map(((departmentRows.data ?? []) as Array<{ id: string; name: string }>).map((d) => [d.id, d.name]));

    const TIPO_LABEL: Record<string, string> = { assumido: "Conversa assumida", transferido: "Conversa transferida", resolvido: "Conversa resolvida" };

    for (const row of eventosRows) {
      const conversaInfo = Array.isArray(row.conversas) ? row.conversas[0] : row.conversas;
      const quem = row.user_id ? emailById.get(row.user_id) ?? "atendente" : "sistema/IA";
      const detalhePartes = [`por ${quem}`];
      if (row.department_id) detalhePartes.push(`para ${deptNameById.get(row.department_id) ?? "departamento"}`);

      events.push({
        tipo: "conversa_evento",
        data: row.criado_em,
        titulo: `${TIPO_LABEL[row.tipo] ?? row.tipo} (${conversaInfo?.canal ?? "?"}, protocolo #${String(conversaInfo?.protocolo ?? 0).padStart(4, "0")})`,
        detalhe: detalhePartes.join(" "),
        conversa_id: row.conversa_id,
      });
    }
  }

  events.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  return NextResponse.json({ events });
}
