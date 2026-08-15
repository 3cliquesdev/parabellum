import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/auth/guard";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";

interface UpdateTicketBody {
  titulo?: string;
  descricao?: string;
  categoria_id?: string | null;
  status?: "aberto" | "em_andamento" | "aguardando_cliente" | "resolvido" | "fechado";
  prioridade?: "baixa" | "media" | "alta" | "urgente";
  assigned_to?: string | null;
}

async function getTicketTenantId(ticketId: string): Promise<string | null> {
  const { data } = await createAdminClient().from("tickets").select("tenant_id").eq("id", ticketId).maybeSingle();
  return (data as { tenant_id?: string } | null)?.tenant_id ?? null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await getTicketTenantId(id);
  if (!tenantId) return NextResponse.json({ error: "Ticket nao encontrado" }, { status: 404 });

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;

  const [{ data: ticket }, { data: comments }, { data: stakeholders }] = await Promise.all([
    auth.admin.from("tickets").select("*, ticket_categories(nome, cor)").eq("id", id).single(),
    auth.admin.from("ticket_comments").select("*").eq("ticket_id", id).order("created_at", { ascending: true }),
    auth.admin.from("ticket_stakeholders").select("*").eq("ticket_id", id),
  ]);

  return NextResponse.json({ ticket, comments: comments ?? [], stakeholders: stakeholders ?? [] });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await getTicketTenantId(id);
  if (!tenantId) return NextResponse.json({ error: "Ticket nao encontrado" }, { status: 404 });

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as UpdateTicketBody;
  const updates: Record<string, unknown> = {};
  if (body.titulo !== undefined) updates.titulo = body.titulo;
  if (body.descricao !== undefined) updates.descricao = body.descricao;
  if (body.categoria_id !== undefined) updates.categoria_id = body.categoria_id;
  if (body.prioridade !== undefined) updates.prioridade = body.prioridade;
  if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to;
  if (body.status !== undefined) {
    updates.status = body.status;
    if (body.status === "resolvido") updates.resolved_at = new Date().toISOString();
    if (body.status === "fechado") updates.closed_at = new Date().toISOString();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
  }

  const { data, error } = await auth.admin
    .from("tickets")
    .update(updates)
    .eq("id", id)
    .select("*, ticket_categories(nome, cor)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ticket: data });
}
