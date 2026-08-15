import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversaCanal, LooseDatabase } from "@/types/database";
import { sendMail } from "@/lib/mailer";
import { sendInstagramTextMessage } from "@/lib/meta-channel";

type AdminClient = SupabaseClient<LooseDatabase>;

type LeadRef = {
  id: string;
  nome: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
};

type ConversationLookup = {
  id: string;
  tenant_id: string;
  canal: ConversaCanal;
  leads: LeadRef | LeadRef[] | null;
};

interface WhatsAppConfigRow {
  phone_number_id: string;
  access_token: string;
}

interface InstagramConfigRow {
  page_id: string;
  access_token: string;
}

interface MetaMediaUploadResponse {
  id?: string;
}

interface MetaSendMessageResponse {
  messages?: Array<{ id?: string }>;
}

type MediaMessageType = "image" | "audio" | "video" | "document";

function singleLead(leads: ConversationLookup["leads"]) {
  return Array.isArray(leads) ? leads[0] ?? null : leads;
}

function getMediaMessageType(mimeType: string): MediaMessageType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function loadConversationForOutbound(supabase: AdminClient, conversationId: string) {
  const { data } = await supabase
    .from("conversas")
    .select("id, tenant_id, canal, lead_id, leads(id, nome, whatsapp, email, instagram)")
    .eq("id", conversationId)
    .maybeSingle();

  return (data as unknown as ConversationLookup | null) ?? null;
}

async function resolveInstagramRecipientId(supabase: AdminClient, conversation: ConversationLookup) {
  const lead = singleLead(conversation.leads);
  if (!lead?.id) return null;

  const { data } = await supabase
    .from("lead_identities")
    .select("external_id, valor")
    .eq("tenant_id", conversation.tenant_id)
    .eq("lead_id", lead.id)
    .eq("canal", "instagram")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const identity = data as { external_id?: string | null; valor?: string | null } | null;
  return identity?.external_id ?? null;
}

export async function sendWhatsAppConversationMessage(
  supabase: AdminClient,
  conversation: ConversationLookup,
  text: string,
  file?: File | null,
) {
  const lead = singleLead(conversation.leads);
  const toNumber = lead?.whatsapp?.replace(/\D/g, "") ?? "";
  if (!toNumber) {
    return { ok: false as const, error: "Lead sem numero de WhatsApp" };
  }

  const { data: waConfig } = await supabase
    .from("whatsapp_configs")
    .select("phone_number_id, access_token")
    .eq("tenant_id", conversation.tenant_id)
    .eq("active", true)
    .maybeSingle();

  const config = waConfig as unknown as WhatsAppConfigRow | null;
  if (!config) {
    return { ok: false as const, error: "WhatsApp nao configurado" };
  }

  let mediaUrl: string | null = null;
  let mediaType: MediaMessageType | null = null;
  let mediaName: string | null = null;
  let mediaMime: string | null = null;
  let outboundMessageId: string | null = null;

  if (file) {
    const mimeType = file.type;
    const buffer = await file.arrayBuffer();
    const fileName = `${conversation.tenant_id}/${Date.now()}_${file.name}`;

    await supabase.storage.from("whatsapp-media").upload(fileName, buffer, {
      contentType: mimeType,
      upsert: true,
    });

    const { data: urlData } = supabase.storage.from("whatsapp-media").getPublicUrl(fileName);
    mediaUrl = urlData.publicUrl;
    mediaName = file.name;
    mediaMime = mimeType;
    mediaType = getMediaMessageType(mimeType);

    const metaFormData = new FormData();
    metaFormData.append("messaging_product", "whatsapp");
    metaFormData.append("file", new Blob([buffer], { type: mimeType }), file.name);

    const uploadResponse = await fetch(`https://graph.facebook.com/v20.0/${config.phone_number_id}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.access_token}` },
      body: metaFormData,
    });
    if (!uploadResponse.ok) {
      return { ok: false as const, error: "Falha ao fazer upload da midia" };
    }

    const uploadData = (await uploadResponse.json()) as MetaMediaUploadResponse;
    if (!uploadData.id) {
      return { ok: false as const, error: "Media id ausente" };
    }

    const payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      to: toNumber,
      type: mediaType,
    };
    payload[mediaType] = mediaType === "document"
      ? { id: uploadData.id, filename: file.name }
      : { id: uploadData.id };

    const response = await fetch(`https://graph.facebook.com/v20.0/${config.phone_number_id}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.access_token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return { ok: false as const, error: "Falha ao enviar midia" };
    }

    const responseData = (await response.json()) as MetaSendMessageResponse;
    outboundMessageId = responseData.messages?.[0]?.id ?? null;
    text = file.name;
  } else {
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
        text: { body: text },
      }),
    });
    if (!response.ok) {
      return { ok: false as const, error: "Falha ao enviar mensagem" };
    }

    const responseData = (await response.json()) as MetaSendMessageResponse;
    outboundMessageId = responseData.messages?.[0]?.id ?? null;
  }

  await supabase.from("mensagens").insert({
    conversa_id: conversation.id,
    tenant_id: conversation.tenant_id,
    remetente: "humano",
    conteudo: text,
    wa_message_id: outboundMessageId,
    external_message_id: outboundMessageId ? `whatsapp:${outboundMessageId}` : null,
    enviada: true,
    media_url: mediaUrl,
    media_type: mediaType,
    media_nome: mediaName,
    media_mime: mediaMime,
    metadata: { canal: "whatsapp", direction: "outbound" },
  });

  await supabase
    .from("conversas")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation.id);

  return { ok: true as const };
}

export async function sendEmailConversationMessage(
  supabase: AdminClient,
  conversation: ConversationLookup,
  text: string,
  subject?: string | null,
) {
  const lead = singleLead(conversation.leads);
  if (!lead?.email) {
    return { ok: false as const, error: "Lead sem email para envio" };
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("nome_fantasia, name")
    .eq("id", conversation.tenant_id)
    .maybeSingle();

  const tenantInfo = tenant as { nome_fantasia?: string | null; name?: string | null } | null;
  const senderName = tenantInfo?.nome_fantasia ?? tenantInfo?.name ?? "3Cliques CRM";
  const safeText = escapeHtml(text).replace(/\n/g, "<br />");
  const finalSubject = subject?.trim() || `Nova mensagem de ${senderName}`;

  const sent = await sendMail({
    to: lead.email,
    subject: finalSubject,
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#111827">${safeText}</div>`,
    fromName: senderName,
  });

  if (!sent) {
    return { ok: false as const, error: "Falha ao enviar email" };
  }

  await supabase.from("mensagens").insert({
    conversa_id: conversation.id,
    tenant_id: conversation.tenant_id,
    remetente: "humano",
    conteudo: text,
    wa_message_id: null,
    external_message_id: null,
    enviada: true,
    metadata: {
      canal: "email",
      direction: "outbound",
      subject: finalSubject,
      to: lead.email,
    },
  });

  await supabase
    .from("conversas")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation.id);

  return { ok: true as const };
}

export async function sendInstagramConversationMessage(
  supabase: AdminClient,
  conversation: ConversationLookup,
  text: string,
) {
  const recipientId = await resolveInstagramRecipientId(supabase, conversation);
  if (!recipientId) {
    return { ok: false as const, error: "Lead sem identificador de Instagram para resposta" };
  }

  const { data: igConfig } = await supabase
    .from("instagram_configs")
    .select("page_id, access_token")
    .eq("tenant_id", conversation.tenant_id)
    .eq("active", true)
    .maybeSingle();

  const config = igConfig as unknown as InstagramConfigRow | null;
  if (!config) {
    return { ok: false as const, error: "Instagram nao configurado" };
  }

  let outboundMessageId: string | null = null;
  try {
    outboundMessageId = await sendInstagramTextMessage(config.access_token, config.page_id, recipientId, text);
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Falha ao enviar mensagem no Instagram",
    };
  }

  await supabase.from("mensagens").insert({
    conversa_id: conversation.id,
    tenant_id: conversation.tenant_id,
    remetente: "humano",
    conteudo: text,
    wa_message_id: null,
    external_message_id: outboundMessageId ? `instagram:${outboundMessageId}` : null,
    enviada: true,
    metadata: {
      canal: "instagram",
      direction: "outbound",
      recipient_id: recipientId,
      page_id: config.page_id,
    },
  });

  await supabase
    .from("conversas")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation.id);

  return { ok: true as const };
}
