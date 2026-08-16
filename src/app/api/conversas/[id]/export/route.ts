import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";

interface MensagemRow {
  remetente: "lead" | "ia" | "humano";
  conteudo: string;
  created_at: string;
  media_url: string | null;
  media_type: string | null;
  media_nome: string | null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: conversaId } = await params;
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;

  const { data: conversa } = await auth.admin
    .from("conversas")
    .select("protocolo, tenant_id, leads(nome)")
    .eq("id", conversaId)
    .maybeSingle();

  const conversation = conversa as unknown as { protocolo: number; tenant_id: string; leads: { nome: string } | { nome: string }[] | null } | null;
  if (!conversation || conversation.tenant_id !== tenantId) {
    return NextResponse.json({ error: "conversa nao encontrada" }, { status: 404 });
  }

  const lead = Array.isArray(conversation.leads) ? conversation.leads[0] : conversation.leads;
  const leadNome = lead?.nome ?? "Contato";

  const { data: mensagens } = await auth.admin
    .from("mensagens")
    .select("remetente, conteudo, created_at, media_url, media_type, media_nome")
    .eq("conversa_id", conversaId)
    .order("created_at", { ascending: true });

  const linhas = ((mensagens ?? []) as unknown as MensagemRow[]).map((msg) => {
    const quem = msg.remetente === "lead" ? leadNome : msg.remetente === "ia" ? "IA" : "Atendente";
    const quando = new Date(msg.created_at).toLocaleString("pt-BR");
    const corpo = msg.media_url ? `[${msg.media_type ?? "midia"}: ${msg.media_nome ?? msg.media_url}]${msg.conteudo ? ` ${msg.conteudo}` : ""}` : msg.conteudo;
    return `[${quando}] ${quem}: ${corpo}`;
  });

  const conteudo = linhas.join("\n");
  const nomeArquivo = `conversa-${String(conversation.protocolo).padStart(4, "0")}-${leadNome.replace(/\s+/g, "_")}.txt`;

  return new NextResponse(conteudo, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}
