import { NextRequest, NextResponse } from "next/server";
import { isInternalRequest } from "@/lib/security/internal-auth";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";
import { logAiDecision } from "@/lib/security/ai-audit";

interface SendMessageBody {
  conversa_id?: string;
  tenant_id?: string;
  conteudo?: string;
  remetente?: "humano" | "ia";
  departamento?: string;
  reply_to_mensagem_id?: string;
  /** Nome do agente de IA que respondeu (ex: "Hunter", "Ana Julia") - so gravado quando remetente="ia". */
  ia_agente?: string;
  /** Estado interno calculado pelo orquestrador depois de uma resposta da IA. */
  orchestration_context_patch?: Record<string, unknown>;
}

interface RelatedLeadRow {
  whatsapp: string | null;
}

interface ConversationRow {
  id: string;
  tenant_id: string;
  canal: string;
  lead_id: string | null;
  assigned_to: string | null;
  whatsapp_config_id: string | null;
  leads: RelatedLeadRow | RelatedLeadRow[] | null;
}

function buildConversaUpdates(
  remetente: "humano" | "ia",
  departamento?: string,
  orchestrationContextPatch?: Record<string, unknown>,
): Record<string, unknown> {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    ultima_mensagem_remetente: remetente,
    ultima_mensagem_em: new Date().toISOString(),
  };
  if (remetente === "ia") {
    updates.ultima_resposta_ia_em = new Date().toISOString();
    if (departamento) updates.ia_ultimo_departamento = departamento;
  }
  if (remetente === "humano") {
    updates.agente_respondeu = true;
  }
  if (orchestrationContextPatch) updates.orchestration_context = orchestrationContextPatch;
  return updates;
}

interface WhatsAppConfigRow {
  phone_number_id: string;
  access_token: string;
}

interface MetaMediaUploadResponse {
  id?: string;
}

type MediaMessageType = "image" | "audio" | "video" | "document" | "sticker";

interface MetaSendMessageResponse {
  messages?: Array<{ id?: string }>;
}

function getLeadPhone(leads: ConversationRow["leads"]): string {
  const lead = Array.isArray(leads) ? leads[0] : leads;
  return lead?.whatsapp?.replace(/\D/g, "") ?? "";
}

function getMediaMessageType(mimeType: string): MediaMessageType {
  if (mimeType === "image/webp") return "sticker";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const isFormData = contentType.includes("multipart/form-data");

  let conversaId = "";
  let tenantId = "";
  let conteudo = "";
  let remetente: "humano" | "ia" = "humano";
  let departamento: string | undefined;
  let orchestrationContextPatch: Record<string, unknown> | undefined;
  let file: File | null = null;
  let replyToMensagemId: string | undefined;
  let iaAgente: string | undefined;

  if (isFormData) {
    const formData = await request.formData();
    conversaId = String(formData.get("conversa_id") ?? "");
    tenantId = String(formData.get("tenant_id") ?? "");
    file = formData.get("file") as File | null;
    conteudo = file?.name ?? "";
  } else {
    const body = (await request.json().catch(() => ({}))) as SendMessageBody;
    conversaId = body.conversa_id ?? "";
    tenantId = body.tenant_id ?? "";
    conteudo = body.conteudo ?? "";
    remetente = body.remetente === "ia" ? "ia" : "humano";
    departamento = body.departamento;
    replyToMensagemId = body.reply_to_mensagem_id;
    iaAgente = body.ia_agente;
    // O estado de orquestração é interno. Só chamadas autenticadas pelo
    // orquestrador podem gravá-lo; nunca aceite isso de um usuário do painel.
    if (body.orchestration_context_patch && isInternalRequest(request)) {
      orchestrationContextPatch = body.orchestration_context_patch;
    }
  }

  if (!conversaId || !tenantId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;
  const supabase = auth.admin;

  const { data: conversa } = await supabase
    .from("conversas")
    .select("*, leads(whatsapp)")
    .eq("id", conversaId)
    .single();
  const conversation = conversa as unknown as ConversationRow | null;
  if (!conversation || conversation.tenant_id !== tenantId) {
    return NextResponse.json({ error: "Conversa nao encontrada" }, { status: 404 });
  }

  if (conversation.canal !== "whatsapp") {
    if (!conteudo) return NextResponse.json({ error: "Conteudo vazio" }, { status: 400 });
    const { error: insertError } = await supabase.from("mensagens").insert({
      conversa_id: conversaId,
      tenant_id: tenantId,
      remetente,
      conteudo,
      enviada: true,
      ia_agente_nome: remetente === "ia" ? iaAgente ?? null : null,
    });
    if (insertError) {
      return NextResponse.json({ error: `Falha ao salvar mensagem: ${insertError.message}` }, { status: 500 });
    }
    await supabase.from("conversas").update(buildConversaUpdates(remetente, departamento, orchestrationContextPatch)).eq("id", conversaId);
    await supabase.from("conversas").update({ primeira_resposta_em: new Date().toISOString() }).eq("id", conversaId).is("primeira_resposta_em", null);
    if (remetente === "ia" && isInternalRequest(request)) {
      await logAiDecision(supabase, {
        tenantId,
        leadId: conversation.lead_id,
        conversaId,
        acao: "enviar_resposta",
        detalhes: { canal: conversation.canal, conteudo },
      });
    }
    return NextResponse.json({ status: "sent" });
  }

  let config: WhatsAppConfigRow | null = null;
  if (conversation.whatsapp_config_id) {
    const { data } = await supabase
      .from("whatsapp_configs")
      .select("phone_number_id, access_token")
      .eq("id", conversation.whatsapp_config_id)
      .eq("active", true)
      .maybeSingle();
    config = data as unknown as WhatsAppConfigRow | null;
  }
  if (!config) {
    // Fallback pra conversas antigas (de antes de suportarmos mais de um
    // numero por tenant): usa o numero "universal", sem dono dedicado.
    const { data } = await supabase
      .from("whatsapp_configs")
      .select("phone_number_id, access_token")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .is("dedicado_para_user_id", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    config = data as unknown as WhatsAppConfigRow | null;
  }
  if (!config) return NextResponse.json({ error: "WhatsApp nao configurado" }, { status: 400 });

  const toNumber = getLeadPhone(conversation.leads);
  if (!toNumber) return NextResponse.json({ error: "Lead sem numero de WhatsApp" }, { status: 400 });

  let replyContext: { context: { message_id: string } } | Record<string, never> = {};
  if (replyToMensagemId) {
    const { data: quotedMessage } = await supabase
      .from("mensagens")
      .select("wa_message_id")
      .eq("id", replyToMensagemId)
      .maybeSingle();
    const waMessageId = (quotedMessage as { wa_message_id?: string | null } | null)?.wa_message_id;
    if (waMessageId) replyContext = { context: { message_id: waMessageId } };
  }

  let mediaUrl: string | null = null;
  let mediaType: MediaMessageType | null = null;
  let mediaNome: string | null = null;
  let mediaMime: string | null = null;
  let outboundMessageId: string | null = null;

  if (file) {
    const mimeType = file.type;
    const buffer = await file.arrayBuffer();
    const fileName = `${tenantId}/${Date.now()}_${file.name}`;

    const { error: storageError } = await supabase.storage.from("whatsapp-media").upload(fileName, buffer, {
      contentType: mimeType,
      upsert: true,
    });
    if (storageError) {
      return NextResponse.json({ error: `Falha ao salvar midia no Storage: ${storageError.message}` }, { status: 500 });
    }
    const { data: urlData } = supabase.storage.from("whatsapp-media").getPublicUrl(fileName);
    mediaUrl = urlData.publicUrl;
    mediaNome = file.name;
    mediaMime = mimeType;

    const metaFormData = new FormData();
    metaFormData.append("messaging_product", "whatsapp");
    metaFormData.append("file", new Blob([buffer], { type: mimeType }), file.name);

    const uploadResponse = await fetch(`https://graph.facebook.com/v20.0/${config.phone_number_id}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.access_token}` },
      body: metaFormData,
    });
    if (!uploadResponse.ok) {
      return NextResponse.json({ error: "Falha ao fazer upload da midia" }, { status: 500 });
    }

    const uploadData = (await uploadResponse.json()) as MetaMediaUploadResponse;
    const mediaId = uploadData.id;
    if (!mediaId) return NextResponse.json({ error: "Media id ausente" }, { status: 500 });

    mediaType = getMediaMessageType(mimeType);
    conteudo = file.name;

    const payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      to: toNumber,
      type: mediaType,
      ...replyContext,
    };
    payload[mediaType] = mediaType === "document"
      ? { id: mediaId, filename: file.name }
      : { id: mediaId };

    const response = await fetch(`https://graph.facebook.com/v20.0/${config.phone_number_id}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.access_token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return NextResponse.json({ error: "Falha ao enviar midia" }, { status: 500 });
    const responseData = (await response.json()) as MetaSendMessageResponse;
    outboundMessageId = responseData.messages?.[0]?.id ?? null;
  } else {
    if (!conteudo) return NextResponse.json({ error: "Conteudo vazio" }, { status: 400 });

    const response = await fetch(`https://graph.facebook.com/v20.0/${config.phone_number_id}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.access_token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toNumber,
        type: "text",
        text: { body: conteudo },
        ...replyContext,
      }),
    });
    if (!response.ok) return NextResponse.json({ error: "Falha ao enviar mensagem" }, { status: 500 });
    const responseData = (await response.json()) as MetaSendMessageResponse;
    outboundMessageId = responseData.messages?.[0]?.id ?? null;
  }

  const { error: insertError } = await supabase.from("mensagens").insert({
    conversa_id: conversaId,
    tenant_id: tenantId,
    remetente,
    conteudo,
    enviada: true,
    status: "sent",
    wa_message_id: outboundMessageId,
    external_message_id: outboundMessageId ? `whatsapp:${outboundMessageId}` : null,
    reply_to_mensagem_id: replyToMensagemId ?? null,
    media_url: mediaUrl,
    media_type: mediaType,
    media_nome: mediaNome,
    media_mime: mediaMime,
    ia_agente_nome: remetente === "ia" ? iaAgente ?? null : null,
  });
  if (insertError) {
    return NextResponse.json({ error: `Mensagem enviada mas nao salva: ${insertError.message}` }, { status: 500 });
  }
  await supabase
    .from("conversas")
    .update(buildConversaUpdates(remetente, departamento, orchestrationContextPatch))
    .eq("id", conversaId);
  await supabase.from("conversas").update({ primeira_resposta_em: new Date().toISOString() }).eq("id", conversaId).is("primeira_resposta_em", null);

  if (remetente === "ia" && isInternalRequest(request)) {
    await logAiDecision(supabase, {
      tenantId,
      leadId: conversation.lead_id,
      conversaId,
      acao: "enviar_resposta",
      detalhes: { canal: "whatsapp", conteudo },
    });
  }

  return NextResponse.json({ status: "sent" });
}
