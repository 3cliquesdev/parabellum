import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/auth/guard";
import { consumeApiRateLimit } from "@/lib/security/rate-limit";
import { ingestInboundMessage } from "@/lib/inbox/service";
import { dispatchWebhook } from "@/lib/webhooks";
import { maskPII } from "@/lib/security/pii-mask";
import { checkAndHandleCsatReply } from "@/lib/inbox/csat";

interface WebchatMessageBody {
  tenant_id?: string;
  visitor_id?: string;
  nome?: string;
  mensagem?: string;
  origem?: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as WebchatMessageBody;
  const { tenant_id, visitor_id, mensagem } = body;
  if (!tenant_id || !visitor_id || !mensagem?.trim()) {
    return NextResponse.json({ error: "tenant_id, visitor_id e mensagem sao obrigatorios" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!await consumeApiRateLimit(admin, `webchat:msg:${visitor_id}`, 20, 60)) {
    return NextResponse.json({ error: "Muitas mensagens em pouco tempo. Aguarde um momento." }, { status: 429 });
  }

  const result = await ingestInboundMessage({
    supabase: admin,
    tenantId: tenant_id,
    canal: "webchat",
    identity: { canal: "webchat", value: visitor_id, externalId: visitor_id },
    lead: { name: body.nome ?? "Visitante do site", origem: body.origem || "webchat" },
    message: { text: mensagem },
  });

  if (!result.duplicate && result.lead && result.conversation) {
    const csatHandled = await checkAndHandleCsatReply(admin, {
      id: result.conversation.id,
      tenant_id,
      lead_id: result.lead.id,
      canal: "webchat",
      aguardando_csat: (result.conversation as { aguardando_csat?: boolean }).aguardando_csat,
    }, mensagem);

    if (!csatHandled) await dispatchWebhook(tenant_id, "message.received", {
      lead_id: result.lead.id,
      lead_nome: (result.lead as { nome?: string | null }).nome ?? null,
      conversa_id: result.conversation.id,
      mensagem: maskPII(mensagem).masked,
      tipo: "text",
      canal: "webchat",
    });
  }

  return NextResponse.json({
    ok: true,
    lead_id: result.lead?.id ?? null,
    conversa_id: result.conversation?.id ?? null,
  });
}
