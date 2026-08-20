import type { SupabaseClient } from "@supabase/supabase-js";
import type { LooseDatabase } from "@/types/database";
import { getLeadDirectIdentity, normalizeChannelIdentity, phoneSuffix8, type InboxExternalCanal } from "@/lib/inbox/channels";
import { resolvePipelinePadrao } from "@/lib/negocios/pipeline-padrao";
import { registrarEventoNegocio } from "@/lib/negocios/eventos";
import { reconcileLeadWithKiwify } from "@/lib/kiwify-reconciliation";

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

export interface InboxLeadExtraFields {
  cpf?: string | null;
  enderecoRua?: string | null;
  enderecoNumero?: string | null;
  enderecoComplemento?: string | null;
  enderecoBairro?: string | null;
  enderecoCidade?: string | null;
  enderecoEstado?: string | null;
  enderecoCep?: string | null;
}

export interface InboxLeadInput {
  id?: string | null;
  name?: string | null;
  identities?: InboxIdentityInput[];
  // Canal real de aquisicao do lead (ex: "kiwify"), gravado so na criacao. Se
  // omitido, usa o canal da identidade primaria (comportamento anterior).
  origem?: string | null;
  extra?: InboxLeadExtraFields;
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
  replyToWaMessageId?: string | null;
}

export interface IngestInboundMessageParams {
  supabase: AdminClient;
  tenantId: string;
  canal: InboxExternalCanal;
  identity: InboxIdentityInput;
  lead?: InboxLeadInput;
  message: InboxMessageInput;
  channelHints?: ConversationChannelHints;
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
    if (identity.canal === "whatsapp") {
      // Compara pelos ultimos 8 digitos (numero de assinante, sem DDD nem o
      // 9º digito) em vez do valor inteiro - o mesmo lead pode ter chegado
      // com e sem o 9 dependendo da origem (WhatsApp sempre manda com 9,
      // checkout as vezes nao), e uma comparacao exata perde o match.
      const suffix = phoneSuffix8(identity.value);
      if (!suffix) return null;
      const { data } = await supabase
        .from("leads")
        .select("id, tenant_id, nome, whatsapp, email, instagram, status")
        .eq("tenant_id", tenantId)
        .ilike("whatsapp", `%${suffix}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as unknown as LeadRow | null) ?? null;
    }

    const query = supabase
      .from("leads")
      .select("id, tenant_id, nome, whatsapp, email, instagram, status")
      .eq("tenant_id", tenantId);

    if (identity.canal === "email") {
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
  const suffix = phoneSuffix8(identity.value);
  if (!suffix) return null;

  const { data } = await supabase
    .from("vendas")
    .select("lead_id")
    .eq("tenant_id", tenantId)
    .ilike("buyer_phone_normalized", `%${suffix}`)
    .eq("status", "pago")
    .not("lead_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const match = data as { lead_id: string } | null;
  if (!match?.lead_id) return null;
  return loadLeadById(supabase, tenantId, match.lead_id);
}

type KiwifyCustomerSnapshot = {
  nome: string | null;
  email: string | null;
  cpf: string | null;
  enderecoRua: string | null;
  enderecoNumero: string | null;
  enderecoComplemento: string | null;
  enderecoBairro: string | null;
  enderecoCidade: string | null;
  enderecoEstado: string | null;
  enderecoCep: string | null;
  produtoNome: string | null;
};

// Compras antigas podem ter sido gravadas antes de o lead ser criado (ou numa
// falha temporaria do webhook). Quando esse cliente fala no WhatsApp, usamos o
// telefone como chave silenciosa para recuperar os dados originais da Kiwify.
async function findUnlinkedKiwifyCustomerByPhone(
  supabase: AdminClient,
  tenantId: string,
  identity: InboxIdentityInput,
): Promise<KiwifyCustomerSnapshot | null> {
  if (identity.canal !== "whatsapp") return null;
  const suffix = phoneSuffix8(identity.value);
  if (!suffix) return null;

  const { data } = await supabase
    .from("vendas")
    .select("raw_payload, produto_nome")
    .eq("tenant_id", tenantId)
    .ilike("buyer_phone_normalized", `%${suffix}`)
    .is("lead_id", null)
    .eq("origem", "kiwify")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sale = data as { raw_payload?: Record<string, unknown> | null; produto_nome?: string | null } | null;
  if (!sale) return null;

  const payload = sale.raw_payload ?? {};
  const customer = (payload.Customer ?? payload.customer ?? payload) as Record<string, unknown>;
  const read = (...keys: string[]) => {
    for (const key of keys) {
      const value = customer[key] ?? payload[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return null;
  };

  return {
    nome: read("full_name", "name"),
    email: read("email"),
    cpf: read("CPF", "cpf"),
    enderecoRua: read("street"),
    enderecoNumero: read("number"),
    enderecoComplemento: read("complement"),
    enderecoBairro: read("neighborhood"),
    enderecoCidade: read("city"),
    enderecoEstado: read("state"),
    enderecoCep: read("zipcode"),
    produtoNome: sale.produto_nome ?? read("product_name"),
  };
}

async function findLeadByCpf(supabase: AdminClient, tenantId: string, cpf: string | null | undefined) {
  if (!cpf) return null;
  const normalized = cpf.replace(/\D/g, "");
  if (!normalized) return null;

  const { data } = await supabase
    .from("leads")
    .select("id, tenant_id, nome, whatsapp, email, instagram, status")
    .eq("tenant_id", tenantId)
    .eq("cpf", normalized)
    .maybeSingle();

  return (data as unknown as LeadRow | null) ?? null;
}

// Reivindica a identidade primaria de um lead recem-criado de forma atomica,
// usando o indice unico (tenant_id, canal, valor_normalizado) de
// lead_identities como arbitro. Sem isso, dois webhooks quase simultaneos
// (ex: cartao recusado + nova tentativa, comum na Kiwify) passam os dois pelo
// SELECT de "ja existe?" antes de qualquer um commitar o INSERT, e cada um
// cria um lead duplicado (confirmado em producao: leads com o mesmo email
// criados a menos de 1.1s de diferenca).
async function claimPrimaryIdentity(
  supabase: AdminClient,
  tenantId: string,
  leadId: string,
  identity: InboxIdentityInput,
): Promise<boolean> {
  const normalizedValue = normalizeChannelIdentity(identity.canal, identity.value);
  if (!normalizedValue && !identity.externalId) return true;

  const { error } = await supabase.from("lead_identities").insert({
    tenant_id: tenantId,
    lead_id: leadId,
    canal: identity.canal,
    valor: identity.value ?? null,
    valor_normalizado: normalizedValue,
    external_id: identity.externalId ?? null,
  });

  if (!error) return true;
  if (error.code === "23505") return false; // perdeu a corrida
  throw error;
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

  let kiwifyCustomer: KiwifyCustomerSnapshot | null = null;
  for (const identity of identities) {
    kiwifyCustomer = await findUnlinkedKiwifyCustomerByPhone(supabase, tenantId, identity);
    if (kiwifyCustomer) break;
  }

  const cpfMatch = await findLeadByCpf(supabase, tenantId, leadInput?.extra?.cpf);
  if (cpfMatch) return cpfMatch;

  const initialLead: Record<string, string | null> = {
    tenant_id: tenantId,
    nome: leadInput?.name?.trim() || kiwifyCustomer?.nome || primaryIdentity.value?.trim() || `Lead ${primaryIdentity.canal}`,
    status: "novo",
    whatsapp: null,
    email: null,
    instagram: null,
    origem_lead: leadInput?.origem ?? (kiwifyCustomer ? "kiwify" : primaryIdentity.canal),
  };

  const directField = directLeadField(primaryIdentity.canal);
  if (directField && primaryIdentity.value) {
    initialLead[directField] = primaryIdentity.value;
  }

  const { data, error } = await supabase
    .from("leads")
    .insert(initialLead)
    .select("id, tenant_id, nome, whatsapp, email, instagram, status")
    .single();

  if (error || !data) {
    throw new Error(`Nao foi possivel criar o lead de entrada: ${error?.message ?? "resposta vazia do banco"}`);
  }

  const newLead = data as LeadRow;

  if (kiwifyCustomer) {
    await syncLeadExtraFields(supabase, newLead, {
      cpf: kiwifyCustomer.cpf,
      enderecoRua: kiwifyCustomer.enderecoRua,
      enderecoNumero: kiwifyCustomer.enderecoNumero,
      enderecoComplemento: kiwifyCustomer.enderecoComplemento,
      enderecoBairro: kiwifyCustomer.enderecoBairro,
      enderecoCidade: kiwifyCustomer.enderecoCidade,
      enderecoEstado: kiwifyCustomer.enderecoEstado,
      enderecoCep: kiwifyCustomer.enderecoCep,
    });
    if (kiwifyCustomer.email) {
      await syncLeadDirectField(supabase, newLead, { canal: "email", value: kiwifyCustomer.email });
      await upsertLeadIdentity(supabase, tenantId, newLead.id, { canal: "email", value: kiwifyCustomer.email });
    }

    const normalizedPhone = normalizeChannelIdentity("whatsapp", primaryIdentity.value);
    if (normalizedPhone) {
      await supabase
        .from("vendas")
        .update({ lead_id: newLead.id })
        .eq("tenant_id", tenantId)
        .eq("buyer_phone_normalized", normalizedPhone)
        .is("lead_id", null)
        .eq("origem", "kiwify");
    }

    await supabase.from("atividades").insert({
      tenant_id: tenantId,
      lead_id: newLead.id,
      tipo: "whatsapp",
      titulo: "Lead recuperado automaticamente da Kiwify",
      descricao: `Identificado silenciosamente pelo WhatsApp${kiwifyCustomer.produtoNome ? ` — compra: ${kiwifyCustomer.produtoNome}` : ""}. Dados da compra foram vinculados ao cadastro.`,
      concluida: true,
      concluida_em: new Date().toISOString(),
    });
  }

  const claimed = await claimPrimaryIdentity(supabase, tenantId, newLead.id, primaryIdentity);
  if (!claimed) {
    // O trigger trg_sync_lead_identity_columns pode ter registrado a
    // identidade para o proprio newLead durante o INSERT. Nesse caso, a
    // segunda insercao acima recebe 23505, mas nao houve corrida: o lead
    // continua sendo o dono correto e nao pode ser apagado.
    const winner = await loadLeadByIdentity(supabase, tenantId, primaryIdentity);
    if (winner?.id === newLead.id) return newLead;

    // Outro request de fato venceu a corrida. O lead recem-criado ainda nao
    // tem conversa, mensagem ou venda associada, entao pode ser removido.
    if (winner) {
      await supabase.from("leads").delete().eq("id", newLead.id);
      return winner;
    }
  } else {
    // Todo lead novo ja nasce como oportunidade no pipeline padrao, etapa
    // "Novo" - unifica o Kanban de Negocios como fonte unica (antes so
    // clientes pagos da Kiwify ganhavam negocio automatico).
    const { pipelineId, etapaId } = await resolvePipelinePadrao(supabase, tenantId);
    if (pipelineId) {
      const origemNegocio = leadInput?.origem ?? primaryIdentity.canal;
      const { data: novoNegocio } = await supabase
        .from("negocios")
        .insert({
          tenant_id: tenantId,
          lead_id: newLead.id,
          titulo: newLead.nome,
          canal: primaryIdentity.canal,
          origem: origemNegocio,
          estagio: "aberto",
          pipeline_id: pipelineId,
          pipeline_etapa_id: etapaId,
        })
        .select("id")
        .single();

      if (novoNegocio) {
        await registrarEventoNegocio(supabase, {
          negocioId: (novoNegocio as { id: string }).id,
          tenantId,
          tipo: "criado",
          etapaNovaId: etapaId,
          origem: origemNegocio,
        });
      }
    }
  }

  return newLead;
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

// Preenche CPF/endereco vindos da Kiwify so nos campos que o lead ainda nao
// tem - nunca sobrescreve dado ja existente no CRM.
async function syncLeadExtraFields(
  supabase: AdminClient,
  lead: LeadRow,
  extra: InboxLeadExtraFields | undefined,
) {
  if (!extra) return lead;

  const { data: current } = await supabase
    .from("leads")
    .select("cpf, endereco_rua, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep")
    .eq("id", lead.id)
    .maybeSingle();

  const currentRow = (current as Record<string, string | null> | null) ?? {};

  const fieldMap: Record<string, string | null | undefined> = {
    cpf: extra.cpf?.replace(/\D/g, "") || null,
    endereco_rua: extra.enderecoRua,
    endereco_numero: extra.enderecoNumero,
    endereco_complemento: extra.enderecoComplemento,
    endereco_bairro: extra.enderecoBairro,
    endereco_cidade: extra.enderecoCidade,
    endereco_estado: extra.enderecoEstado,
    endereco_cep: extra.enderecoCep,
  };

  const updatePayload: Record<string, string> = {};
  for (const [column, value] of Object.entries(fieldMap)) {
    if (value && !currentRow[column]) updatePayload[column] = value;
  }

  if (Object.keys(updatePayload).length === 0) return lead;

  await supabase.from("leads").update(updatePayload).eq("id", lead.id);
  return lead;
}

async function upsertLeadIdentity(
  supabase: AdminClient,
  tenantId: string,
  leadId: string,
  identity: InboxIdentityInput,
) {
  const normalizedValue = normalizeChannelIdentity(identity.canal, identity.value);
  if (!normalizedValue && !identity.externalId) return;

  const payload = {
    tenant_id: tenantId,
    lead_id: leadId,
    canal: identity.canal,
    valor: identity.value ?? null,
    valor_normalizado: normalizedValue,
    external_id: identity.externalId ?? null,
    updated_at: new Date().toISOString(),
  };

  // Upsert atomico via o indice unico (tenant_id, canal, valor_normalizado) -
  // substitui o antigo select-then-insert/update, que tinha a mesma race
  // condition corrigida em claimPrimaryIdentity/resolveLead.
  if (normalizedValue) {
    await supabase.from("lead_identities").upsert(payload, { onConflict: "tenant_id,canal,valor_normalizado" });
    return;
  }

  // Identidades so com external_id (sem valor/valor_normalizado) usam o outro
  // indice unico existente (tenant_id, canal, external_id).
  await supabase.from("lead_identities").upsert(payload, { onConflict: "tenant_id,canal,external_id" });
}

export interface ConversationChannelHints {
  whatsappConfigId?: string | null;
  // Numero "dedicado" a um unico vendedor: ja nasce atribuida a ele, sem
  // passar pelo rodizio de departamento.
  assignedTo?: string | null;
  // Cada numero de WhatsApp pode ter um padrao proprio de IA ligada/desligada
  // pras conversas novas (ex: numero dedicado com IA so fora do expediente).
  iaAtivaPadrao?: boolean;
}

// Tag analitica minima: nenhuma conversa pode ficar sem classificacao. As
// tags de motivo (venda, suporte, encerramento etc.) sao adicionadas depois,
// sem substituir esta marca de entrada.
const TAG_INICIAL_CONVERSA = "0.00 Em atendimento";

async function ensureInitialConversationTag(
  supabase: AdminClient,
  tenantId: string,
  conversaId: string,
) {
  const { data: existingTag, error: findError } = await supabase
    .from("tags")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("nome", TAG_INICIAL_CONVERSA)
    .maybeSingle();
  if (findError) throw new Error(`Nao foi possivel localizar a tag inicial: ${findError.message}`);

  let tagId = (existingTag as { id: string } | null)?.id;
  if (!tagId) {
    const { data: createdTag, error: createError } = await supabase
      .from("tags")
      .insert({ tenant_id: tenantId, nome: TAG_INICIAL_CONVERSA, cor: "#3b82f6" })
      .select("id")
      .single();
    if (createError || !createdTag) {
      throw new Error(`Nao foi possivel criar a tag inicial: ${createError?.message ?? "resposta vazia"}`);
    }
    tagId = (createdTag as { id: string }).id;
  }

  const { error: linkError } = await supabase
    .from("conversation_tags")
    .upsert({ conversa_id: conversaId, tag_id: tagId }, { onConflict: "conversa_id,tag_id" });
  if (linkError) throw new Error(`Nao foi possivel aplicar a tag inicial: ${linkError.message}`);
}

export async function findOrCreateConversation(
  supabase: AdminClient,
  tenantId: string,
  leadId: string,
  canal: InboxExternalCanal,
  channelHints?: ConversationChannelHints,
  options?: { ignorePendingCsat?: boolean },
) {
  let query = supabase
    .from("conversas")
    .select("id, tenant_id, lead_id, canal, status, ia_ativa, ai_mode, aguardando_csat")
    .eq("tenant_id", tenantId)
    .eq("lead_id", leadId)
    .eq("canal", canal);

  // Uma nota de CSAT pertence a conversa encerrada. Qualquer outra mensagem
  // posterior deve comecar um atendimento novo, sem reabrir nem misturar o
  // historico do atendimento que ja foi finalizado.
  query = options?.ignorePendingCsat
    ? query.eq("status", "ativo")
    : query.or("status.eq.ativo,aguardando_csat.eq.true");

  const { data: existingConversation } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingConversation) {
    await ensureInitialConversationTag(supabase, tenantId, (existingConversation as ConversationRow).id);
    return existingConversation as ConversationRow;
  }

  const { data, error } = await supabase
    .from("conversas")
    .insert({
      tenant_id: tenantId,
      lead_id: leadId,
      canal,
      status: "ativo",
      ia_ativa: channelHints?.iaAtivaPadrao ?? true,
      // O agente principal roda no n8n (via webhook message.received). Deixar
      // "disabled" aqui evita que a IA interna do CRM (chat_flows/Gemini)
      // responda em duplicidade com o agente do n8n.
      ai_mode: "disabled",
      whatsapp_config_id: channelHints?.whatsappConfigId ?? null,
      assigned_to: channelHints?.assignedTo ?? null,
      dispatch_status: channelHints?.assignedTo ? "atribuido" : null,
    })
    .select("id, tenant_id, lead_id, canal, status, ia_ativa, ai_mode, aguardando_csat")
    .single();

  if (error || !data) {
    throw new Error(`Nao foi possivel criar a conversa de entrada: ${error?.message ?? "resposta vazia do banco"}`);
  }

  await ensureInitialConversationTag(supabase, tenantId, (data as ConversationRow).id);

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
  options?: { reconcile?: boolean },
) {
  let lead = await resolveLead(supabase, tenantId, identity, leadInput);

  const identities = [identity, ...(leadInput?.identities ?? [])];
  for (const item of identities) {
    lead = await syncLeadDirectField(supabase, lead, item);
  }
  lead = await syncLeadName(supabase, lead, leadInput?.name);
  lead = await syncLeadExtraFields(supabase, lead, leadInput?.extra);

  for (const item of identities) {
    await upsertLeadIdentity(supabase, tenantId, lead.id, item);
  }

  if (options?.reconcile !== false) await reconcileLeadWithKiwify(supabase, tenantId, lead.id);

  return lead;
}

export async function ingestInboundMessage(params: IngestInboundMessageParams) {
  const { supabase, tenantId, canal, identity, lead: leadInput, message, channelHints } = params;
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

  const conversation = await findOrCreateConversation(supabase, tenantId, lead.id, canal, channelHints);

  let replyToMensagemId: string | null = null;
  if (message.replyToWaMessageId) {
    const { data: quotedMessage } = await supabase
      .from("mensagens")
      .select("id")
      .eq("conversa_id", conversation.id)
      .or(`wa_message_id.eq.${message.replyToWaMessageId},external_message_id.eq.${message.replyToWaMessageId}`)
      .maybeSingle();
    replyToMensagemId = (quotedMessage as { id?: string } | null)?.id ?? null;
  }

  const { data: insertedMessage, error: insertError } = await supabase.from("mensagens").insert({
    conversa_id: conversation.id,
    tenant_id: tenantId,
    remetente: "lead",
    conteudo: message.text?.trim() || "[Mensagem sem texto]",
    wa_message_id: canal === "whatsapp" ? message.waMessageId ?? message.externalMessageId ?? null : null,
    external_message_id: externalMessageKey,
    reply_to_mensagem_id: replyToMensagemId,
    enviada: true,
    media_url: message.mediaUrl ?? null,
    media_type: message.mediaType ?? null,
    media_nome: message.mediaName ?? null,
    media_mime: message.mediaMime ?? null,
    media_caption: message.mediaCaption ?? null,
    latitude: message.latitude ?? null,
    longitude: message.longitude ?? null,
    metadata: message.metadata ?? { canal, direction: "inbound" },
  }).select("id").maybeSingle();
  if (insertError) {
    console.error("ingestInboundMessage: falha ao salvar mensagem inbound:", insertError.message);
  }

  await supabase
    .from("conversas")
    .update({
      updated_at: new Date().toISOString(),
      ultima_mensagem_remetente: "lead",
      ultima_mensagem_em: new Date().toISOString(),
      ultima_mensagem_lead_em: new Date().toISOString(),
    })
    .eq("id", conversation.id);

  return {
    duplicate: false,
    lead,
    conversation,
    messageId: (insertedMessage as { id?: string } | null)?.id ?? null,
  };
}
