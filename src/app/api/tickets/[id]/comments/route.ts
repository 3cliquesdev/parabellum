import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/auth/guard";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";

interface AddCommentBody {
  conteudo?: string;
  autor_id?: string | null;
  autor_tipo?: "agente" | "ia" | "sistema" | "cliente";
  interno?: boolean;
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

  const { data, error } = await auth.admin
    .from("ticket_comments")
    .select("*")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: data ?? [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await getTicketTenantId(id);
  if (!tenantId) return NextResponse.json({ error: "Ticket nao encontrado" }, { status: 404 });

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as AddCommentBody;
  if (!body.conteudo) return NextResponse.json({ error: "conteudo e obrigatorio" }, { status: 400 });

  const { data, error } = await auth.admin
    .from("ticket_comments")
    .insert({
      ticket_id: id,
      tenant_id: tenantId,
      conteudo: body.conteudo,
      autor_id: body.autor_id ?? null,
      autor_tipo: body.autor_tipo ?? "agente",
      interno: body.interno ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: data });
}
