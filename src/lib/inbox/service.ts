import type { SupabaseClient } from "@supabase/supabase-js";
import type { LooseDatabase } from "@/types/database";
import { getLeadDirectIdentity, normalizeChannelIdentity, type InboxExternalCanal } from "@/lib/inbox/channels";

type AdminClient = SupabaseClient<LooseDatabase>;

type LeadRow = {
  id: string;
  tenant_id: string;
  nome: string;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  status: string | null;
};

type ConversationRow = {
  id: string;
  tenant_id: string;
  lead_id: string;
  canal: InboxExternalCanal;
  status: string;
  ia_ativa: boolean;
  ai_mode: "autopilot" | "copilot" | "disabled";
  aguardando_csat?: boolean;
};

type IdentityRow = {
  id: string;
  lead_id: string;
  canal: InboxExternalCanal;
  valor: string | null;
  valor_normalizado: string | null;
  external_id: string | null;
};

export type InboxMessageMediaType =
  | "image"
  | "audio"
  | "video"
  | "document"
  | "sticker"
  | "location";

export interface InboxIdentityInput {
  canal: InboxExternalCanal;
  value?: string | null;
  externalId?: string | null;
}

export interface InboxLeadInput {
  id?: string | null;
  name?: string | null;
  identities?: InboxIdentityInput[];
}

export interface InboxMessageInput {
  externalMessageId?: string | null;
  text?: string | null;
  mediaUrl?: string | null;
  mediaType?: InboxMessageMediaType | null;
  mediaName?: string | null;
  mediaMime?: string | null;
  mediaCaption?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  metadata?: Record<string, unknown> | null;
  waMessageId?: string | null;
}

export interface IngestInboundMessageParams {
  supabase: AdminClient;
  tenantId: string;
  canal: InboxExternalCanal;
  identity: InboxIdentityInput;
  lead?: InboxLeadInput;
  message: InboxMessageInput;
}

function buildMessageKey(canal: InboxExternalCanal, externalMessageId?: string | null) {
  if (!externalMessageId) return null;
  return `${canal}:${externalMessageId}`;
}

function directLeadField(canal: InboxExternalCanal) {
  if (canal === "whatsapp" || canal === "email" || canal === "instagram") return canal;
  return null;
}

async function loadLeadById(supabase: AdminClient, tenantId: string, leadId: string) {
  const { data } = await supabase
    .from("leads")
    .select("id, tenant_id, nome, whatsapp, email, instagram, status")
    .eq("tenant_id", tenantId)
    .eq("id", leadId)
    .maybeSingle();

  return (data as unknown as LeadRow | null) ?? null;
}

async function loadLeadByIdentity(
  supabase: AdminClient,
  tenantId: string,
  identity: InboxIdentityInput,
) {
  if (identity.externalId) {
    const { data: byExternal } = await supabase
      .from("lead_identities")
      .select("lead_id")
      .eq("tenant_id", tenantId)
      .eq("canal", identity.canal)
      .eq("external_id", identity.externalId)
      .maybeSingle();

    const externalMatch = byExternal as { lead_id: string } | null;
    if (externalMatch?.lead_id) return loadLeadById(supabase, tenantId, externalMatch.lead_id);
  }

  const normalizedValue = normalizeChannelIdentity(identity.canal, identity.value);
  if (normalizedValue) {
    const { data: byValue } = await supabase
      .from("lead_identities")
      .select("lead_id")
      .eq("tenant_id", tenantId)
      .eq("canal", identity.canal)
      .eq("valor_normalizado", normalizedValue)
      .maybeSingle();

    const valueMatch = byValue as { lead_id: string } | null;
    if (valueMatch?.lead_id) return loadLeadById(supabase, tenantId, valueMatch.lead_id);
  }

  const directField = directLeadField(identity.canal);
  if (directField && identity.value) {
    const query = supabase
      .from("leads")
      .select("id, tenant_id, nome, whatsapp, email, instagram, status")
      .eq("tenant_id", tenantId);

    if (identity.canal === "whatsapp") {
      const normalizedValue = normalizeChannelIdentity("whatsapp", identity.value);
      if (!normalizedValue) return null;
      query.ilike("whatsapp", `%${normalizedValue}%`);
    } else if (identity.canal === "email") {
      query.ilike("email", identity.value.trim().toLowerCase());
    } else if (identity.canal === "instagram") {
      query.ilike("instagram", identity.value.replace(/^@/, ""));
    }

    const { data } = await query.maybeSingle();

    return (data as unknown as LeadRow | null) ?? null;
  }

  return null;
}

// Vinculacao silenciosa telefone <-> cliente Kiwify: fecha o buraco que a
// propria Parabellum documentou (so 1 de 4.581 devolucoes tinha contato
// vinculado, porque a busca por telefone nunca existiu la). So roda pra
// identidade de whatsapp; nunca aparece pro cliente, e o unico efeito e
// reaproveitar o lead certo em vez de criar um duplicado sem historico.
async function findLeadByKiwifyPhone(supabase: AdminClient, tenantId: string, identity: InboxIdentityInput) {
  if (identity.canal !== "whatsapp") return null;
  const normalizedValue = normalizeChannelIdentity("whatsapp", identity.value);
  if (!normalizedValue) return null;

  const { data } = await supabase
    .from("vendas")
    .select("lead_id")
    .eq("tenant_id", tenantId)
    .eq("buyer_phone_normalized", normalizedValue)
    .eq("status", "pago")
    .not("lead_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const match = data as { lead_id: string } | null;
  if (!match?.lead_id) return null;
  return loadLeadById(supabase, tenantId, match.lead_id);
}

async function resolveLead(
  supabase: AdminClient,
  tenantId: string,
  primaryIdentity: InboxIdentityInput,
  leadInput?: InboxLeadInput,
) {
  if (leadInput?.id) {
    const explicitLead = await loadLeadById(supabase, tenantId, leadInput.id);
    if (explicitLead) return explicitLead;
  }

  const identities = [primaryIdentity, ...(leadInput?.identities ?? [])];
  for (const identity of identities) {
    const matchedLead = await loadLeadByIdentity(supabase, tenantId, identity);
    if (matchedLead) return matchedLead;
  }

  for (const identity of identities) {
    const kiwifyMatch = await findLeadByKiwifyPhone(supabase, tenantId, identity);
    if (kiwifyMatch) return kiwifyMatch;
  }

  const initialLead: Record<string, string | null> = {
    tenant_id: tenantId,
    nome: leadInput?.name?.trim() || primaryIdentity.value?.trim() || `Lead ${primaryIdentity.canal}`,
    status: "novo",
    whatsapp: null,
    email: null,
    instagram: null,
  };

  const directField = directLeadField(primaryIdentity.canal);
  if (directField && primaryIdentity.value) {
    initialLead[directField] = primaryIdentity.value;
  }

  const { data } = await supabase
    .from("leads")
    .insert(initialLead)
    .select("id, tenant_id, nome, whatsapp, email, instagram, status")
    .single();

  return data as LeadRow;
}

async function syncLeadDirectField(
  supabase: AdminClient,
  lead: LeadRow,
  identity: InboxIdentityInput,
) {
  const directField = directLeadField(identity.canal);
  if (!directField || !identity.value) return lead;

  const currentValue = getLeadDirectIdentity(lead, identity.canal);
  if (currentValue) return lead;

  const updatePayload: Record<string, string> = { [directField]: identity.value };
  const { data } = await supabase
    .from("leads")
    .update(updatePayload)
    .eq("id", lead.id)
    .select("id, tenant_id, nome, whatsapp, email, instagram, status")
    .single();

  return (data as unknown as LeadRow | null) ?? lead;
}

function shouldReplaceLeadName(currentName: string | null | undefined, nextName: string | null | undefined) {
  const current = currentName?.trim() ?? "";
  const next = nextName?.trim() ?? "";

  if (!next) return false;
  if (!current) return true;
  if (current === next) return false;

  return (
    /^Instagram\s+\d{4,}$/i.test(current) ||
    /^Lead\s+\d+$/i.test(current) ||
    /^Lead\s+(whatsapp|instagram|email)$/i.test(current) ||
    current === "Desconhecido"
  );
}

async function syncLeadName(
  supabase: AdminClient,
  lead: LeadRow,
  nextName: string | null | undefined,
) {
  const trimmedName = nextName?.trim() ?? "";
  if (!shouldReplaceLeadName(lead.nome, trimmedName)) return lead;

  const { data } = await supabase
    .from("leads")
    .update({ nome: trimmedName })
    .eq("id", lead.id)
    .select("id, tenant_id, nome, whatsapp, email, instagram, status")
    .single();

  return (data as unknown as LeadRow | null) ?? lead;
}

async function upsertLeadIdentity(
  supabase: AdminClient,
  tenantId: string,
  leadId: string,
  identity: InboxIdentityInput,
) {
  const normalizedValue = normalizeChannelIdentity(identity.canal, identity.value);
  if (!normalizedValue && !identity.externalId) return;

  let existing: IdentityRow | null = null;

  if (identity.externalId) {
    const { data } = await supabase
      .from("lead_identities")
      .select("id, lead_id, canal, valor, valor_normalizado, external_id")
      .eq("tenant_id", tenantId)
      .eq("canal", identity.canal)
      .eq("external_id", identity.externalId)
      .maybeSingle();

    existing = (data as unknown as IdentityRow | null) ?? null;
  }

  if (!existing && normalizedValue) {
    const { data } = await supabase
      .from("lead_identities")
      .select("id, lead_id, canal, valor, valor_normalizado, external_id")
      .eq("tenant_id", tenantId)
      .eq("canal", identity.canal)
      .eq("valor_normalizado", normalizedValue)
      .maybeSingle();

    existing = (data as unknown as IdentityRow | null) ?? null;
  }

  const payload = {
    tenant_id: tenantId,
    lead_id: leadId,
    canal: identity.canal,
    valor: identity.value ?? null,
    valor_normalizado: normalizedValue,
    external_id: identity.externalId ?? null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await supabase.from("lead_identities").update(payload).eq("id", existing.id);
    return;
  }

  await supabase.from("lead_identities").insert(payload);
}

async function findOrCreateConversation(
  supabase: AdminClient,
  tenantId: string,
  leadId: string,
  canal: InboxExternalCanal,
) {
  const { data: existingConversation } = await supabase
    .from("conversas")
    .select("id, tenant_id, lead_id, canal, status, ia_ativa, ai_mode, aguardando_csat")
    .eq("tenant_id", tenantId)
    .eq("lead_id", leadId)
    .eq("canal", canal)
    .or("status.eq.ativo,aguardando_csat.eq.true")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingConversation) {
    return existingConversation as ConversationRow;
  }

  const { data } = await supabase
    .from("conversas")
    .insert({
      tenant_id: tenantId,
      lead_id: leadId,
      canal,
      status: "ativo",
      ia_ativa: true,
      // O agente principal roda no n8n (via webhook message.received). Deixar
      // "disabled" aqui evita que a IA interna do CRM (chat_flows/Gemini)
      // responda em duplicidade com o agente do n8n.
      ai_mode: "disabled",
    })
    .select("id, tenant_id, lead_id, canal, status, ia_ativa, ai_mode, aguardando_csat")
    .single();

  return data as ConversationRow;
}

// Resolve/cria o lead e sincroniza identidades sem tocar em conversas/mensagens.
// Usado por integracoes que so precisam vincular um evento a um lead (ex:
// webhook de status de pedido da Kiwify) e NAO devem gerar uma mensagem
// fake no Inbox como se o cliente tivesse escrito algo.
export async function resolveOrLinkLead(
  supabase: AdminClient,
  tenantId: string,
  identity: InboxIdentityInput,
  leadInput?: InboxLeadInput,
) {
  let lead = await resolveLead(supabase, tenantId, identity, leadInput);
  lead = await syncLeadDirectField(supabase, lead, identity);
  lead = await syncLeadName(supabase, lead, leadInput?.name);

  const identities = [identity, ...(leadInput?.identities ?? [])];
  for (const item of identities) {
    await upsertLeadIdentity(supabase, tenantId, lead.id, item);
  }

  return lead;
}

export async function ingestInboundMessage(params: IngestInboundMessageParams) {
  const { supabase, tenantId, canal, identity, lead: leadInput, message } = params;
  const externalMessageKey = buildMessageKey(canal, message.externalMessageId ?? message.waMessageId);

  if (externalMessageKey) {
    const { data: existingMessage } = await supabase
      .from("mensagens")
      .select("id, conversa_id")
      .eq("external_message_id", externalMessageKey)
      .maybeSingle();

    if (existingMessage) {
      return { duplicate: true, lead: null, conversation: null };
    }
  }

  const lead = await resolveOrLinkLead(supabase, tenantId, identity, leadInput);

  const conversation = await findOrCreateConversation(supabase, tenantId, lead.id, canal);

  const { error: insertError } = await supabase.from("mensagens").insert({
    conversa_id: conversation.id,
    tenant_id: tenantId,
    remetente: "lead",
    conteudo: message.text?.trim() || "[Mensagem sem texto]",
    wa_message_id: canal === "whatsapp" ? message.waMessageId ?? message.externalMessageId ?? null : null,
    external_message_id: externalMessageKey,
    enviada: true,
    media_url: message.mediaUrl ?? null,
    media_type: message.mediaType ?? null,
    media_nome: message.mediaName ?? null,
    media_mime: message.mediaMime ?? null,
    media_caption: message.mediaCaption ?? null,
    latitude: message.latitude ?? null,
    longitude: message.longitude ?? null,
    metadata: message.metadata ?? { canal, direction: "inbound" },
  });
  if (insertError) {
    console.error("ingestInboundMessage: falha ao salvar mensagem inbound:", insertError.message);
  }

  await supabase
    .from("conversas")
    .update({
      updated_at: new Date().toISOString(),
      ultima_mensagem_remetente: "lead",
      ultima_mensagem_em: new Date().toISOString(),
    })
    .eq("id", conversation.id);

  return {
    duplicate: false,
    lead,
    conversation,
  };
}
