import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";
import { getInternalApiSecret } from "@/lib/security/internal-auth";

interface ResolverBody {
  tenant_id?: string;
  tag_nome?: string;
  resolvido_por?: "ia" | "humano";
  enviar_csat?: boolean;
  ignorar_confirmacao?: boolean;
}

const NAO_CONFIRMACAO_RE = /\?|^\s*(obrigad[ao]|valeu|vlw|blz|beleza|ok|de nada)\s*!?\.?\s*$/i;

const CSAT_MENSAGEM = "Antes de encerrar, avalie nosso atendimento de 1 a 5 (1 = péssimo, 5 = excelente). Responda só com o número.";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: conversaId } = await params;
  const body = (await request.json().catch(() => ({}))) as ResolverBody;
  const { tenant_id, tag_nome, enviar_csat = true, ignorar_confirmacao = false } = body;
  const resolvidoPor = body.resolvido_por === "humano" ? "humano" : "ia";

  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  if (!tag_nome) return NextResponse.json({ error: "tag_nome e obrigatoria para encerrar a conversa" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenant_id);
  if (!auth.ok) return auth.response;

  const { data: conversa } = await auth.admin
    .from("conversas")
    .select("id, tenant_id, lead_id, canal")
    .eq("id", conversaId)
    .eq("tenant_id", tenant_id)
    .maybeSingle();
  const conversation = conversa as { id: string; tenant_id: string; lead_id: string | null; canal: string } | null;
  if (!conversation) return NextResponse.json({ error: "conversa nao encontrada" }, { status: 404 });

  const { data: tag } = await auth.admin
    .from("tags")
    .select("id")
    .eq("tenant_id", tenant_id)
    .eq("nome", tag_nome)
    .maybeSingle();
  const tagRow = tag as { id: string } | null;
  if (!tagRow) return NextResponse.json({ error: `tag_nome '${tag_nome}' nao existe para este tenant` }, { status: 400 });

  // Encerramento automatico por inatividade nao tem "confirmacao do cliente"
  // pra checar - a ultima mensagem dele e so o que disse antes de sumir (pode
  // ate ser uma pergunta). Só a IA respondendo a um "obrigado"/pergunta nova
  // com base numa confirmacao explicita deve passar por essa trava.
  if (resolvidoPor === "ia" && !ignorar_confirmacao) {
    const { data: ultimaMensagem } = await auth.admin
      .from("mensagens")
      .select("conteudo")
      .eq("conversa_id", conversaId)
      .eq("remetente", "lead")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const texto = (ultimaMensagem as { conteudo?: string } | null)?.conteudo ?? "";
    if (NAO_CONFIRMACAO_RE.test(texto.trim())) {
      return NextResponse.json({ error: "ultima mensagem do cliente nao parece uma confirmacao explicita de encerramento" }, { status: 400 });
    }
  }

  await auth.admin.from("conversas").update({
    status: "resolvido",
    resolvido_por: resolvidoPor,
    resolvido_em: new Date().toISOString(),
    ia_ativa: false,
    aguardando_csat: enviar_csat,
  }).eq("id", conversaId);

  // Uma conversa resolvida deve terminar com uma unica tag (o motivo do
  // encerramento) - remove qualquer tag anterior antes de aplicar a nova,
  // em vez de acumular (ex: uma tentativa de fechamento anterior que so
  // aplicou a tag mas nao chegou a resolver por causa da trava acima).
  await auth.admin.from("conversation_tags").delete().eq("conversa_id", conversaId);
  await auth.admin.from("conversation_tags").insert({
    conversa_id: conversaId,
    tag_id: tagRow.id,
  });

  if (enviar_csat) {
    const internalSecret = getInternalApiSecret();
    if (internalSecret) {
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://3cliques-crm.vercel.app"}/api/whatsapp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-key": internalSecret },
        body: JSON.stringify({ tenant_id, conversa_id: conversaId, remetente: "ia", conteudo: CSAT_MENSAGEM }),
      }).catch(() => {});
      await auth.admin.from("conversas").update({ csat_enviado_em: new Date().toISOString() }).eq("id", conversaId);
    }
  }

  return NextResponse.json({ success: true });
}
