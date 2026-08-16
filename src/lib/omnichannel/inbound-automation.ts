import type { SupabaseClient } from "@supabase/supabase-js";
import { GoogleAuth } from "google-auth-library";
import { dispatchConversation } from "@/lib/dispatch";
import { processFlowMessage } from "@/lib/flow-engine";
import { ingestInboundMessage, type ConversationChannelHints, type InboxIdentityInput, type InboxLeadInput, type InboxMessageInput } from "@/lib/inbox/service";
import { dispatchWebhook } from "@/lib/webhooks";
import { checkAndHandleCsatReply } from "@/lib/inbox/csat";
import { maskPII } from "@/lib/security/pii-mask";
import { textToSpeech } from "@/lib/tts";
import type { AtividadeTipo, LooseDatabase } from "@/types/database";

type AdminClient = SupabaseClient<LooseDatabase>;

type IntentMatch = {
  intent: string;
  status: string | null;
  label: string;
};

type SenderAdapter = {
  sendText(text: string): Promise<void>;
  sendAudioBuffer?(audioBuffer: Buffer): Promise<void>;
};

type InboundAutomationParams = {
  supabase: AdminClient;
  tenantId: string;
  canal: InboxIdentityInput["canal"];
  identity: InboxIdentityInput;
  lead?: InboxLeadInput;
  message: InboxMessageInput;
  sender: SenderAdapter;
  activityType?: AtividadeTipo;
  interactionHistoryType?: string;
  channelHints?: ConversationChannelHints;
};

type LeadLike = {
  id: string;
  nome: string | null;
  status?: string | null;
};

type ConversationLike = {
  id: string;
  ia_ativa: boolean;
  ai_mode: "autopilot" | "copilot" | "disabled";
  aguardando_csat?: boolean;
};

type TenantLimitsRow = {
  ai_calls_this_month?: number | null;
  max_ai_calls_per_month?: number | null;
  messages_this_month?: number | null;
  reset_at?: string | null;
};

type PersonaRow = {
  id?: string;
  descricao?: string | null;
  empresa?: string | null;
  temperatura?: number | null;
  max_tokens?: number | null;
  responder_com_audio?: boolean | null;
  voz_tts?: string | null;
};

type MessageHistoryRow = {
  remetente?: string | null;
  conteudo?: string | null;
};

type InteractionHistoryRow = {
  resumo?: string | null;
  created_at: string;
};

const AI_LIMITS: Record<string, number> = { Starter: 200, Pro: 2000, Agency: Infinity };
const VERTEX_PROJECT = "adsliberty";
const VERTEX_LOCATION = "us-central1";
const VERTEX_MODEL = "gemini-2.5-flash";

const INTENT_PATTERNS: Record<string, { keywords: string[]; status: string | null; label: string }> = {
  comercial: { keywords: ["preco", "valor", "quanto custa", "plano", "contratar", "servico", "interesse"], status: "qualificado", label: "Qualificado pela IA" },
  proposta: { keywords: ["proposta", "orcamento", "detalhes", "informacoes", "quero saber mais"], status: "proposta", label: "Pediu proposta" },
  fechamento: { keywords: ["fechar", "contratar", "quero", "comprar", "aceito", "vamos la", "pode confirmar"], status: "ganho", label: "Lead fechado pela IA" },
  desistencia: { keywords: ["nao quero", "desistir", "cancelar", "nao preciso", "dispensado"], status: "perdido", label: "Desistiu" },
  humano: { keywords: ["humano", "atendente", "pessoa", "falar com alguem", "suporte"], status: null, label: "Pediu humano" },
};

const NEGATIVE_WORDS = ["problema", "errado", "pessimo", "horrivel", "absurdo", "insatisfeito", "reclamacao", "nao funciona", "frustrado"];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function getVertexToken() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  const auth = new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  return tokenResponse.token ?? "";
}

async function callGemini(token: string, contents: unknown[], temperature = 0.7, maxTokens = 1000) {
  const url = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_MODEL}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    }),
  });

  if (!res.ok) {
    console.error("Vertex error:", await res.text());
    return "";
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function detectIntent(text: string): IntentMatch | null {
  const lower = normalizeText(text);
  for (const [intent, { keywords, status, label }] of Object.entries(INTENT_PATTERNS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return { intent, status, label };
    }
  }
  return null;
}

function detectNegativeSentiment(text: string) {
  const lower = normalizeText(text);
  return NEGATIVE_WORDS.some((word) => lower.includes(word));
}

async function handoffToHuman(
  supabase: AdminClient,
  tenantId: string,
  conversationId: string,
  lead: LeadLike,
  text: string,
  activityType: AtividadeTipo,
  reason: "handoff_ia" | "sentimento_negativo" | "ia_error" | "ia_low_confidence",
  title: string,
) {
  const dispatch = await dispatchConversation(tenantId, conversationId, "vendas", reason);

  await supabase.from("atividades").insert({
    tenant_id: tenantId,
    lead_id: lead.id,
    tipo: activityType,
    titulo: dispatch.atribuido ? title : `${title} - na fila`,
    descricao: `Ultima mensagem: "${text}"${dispatch.na_fila ? " | Sem agentes disponiveis." : ""}`,
    prazo: new Date().toISOString(),
    concluida: false,
  });
}

async function bumpTenantMessageCount(supabase: AdminClient, tenantId: string, tenantLimits: TenantLimitsRow | null) {
  await supabase.from("tenant_limits").upsert({
    tenant_id: tenantId,
    messages_this_month: (tenantLimits?.messages_this_month ?? 0) + 1,
    updated_at: new Date().toISOString(),
  }, { onConflict: "tenant_id" });
}

async function resolvePersonaForIntent(supabase: AdminClient, tenantId: string, intent: string | null) {
  let persona: PersonaRow | null = null;

  if (intent) {
    const { data: rule } = await supabase
      .from("agent_routing_rules")
      .select("*, personas(*)")
      .eq("tenant_id", tenantId)
      .eq("ativo", true)
      .contains("intents", [intent])
      .order("priority", { ascending: false })
      .single();

    const routingRule = rule as { personas?: PersonaRow | null } | null;
    if (routingRule?.personas) {
      persona = routingRule.personas;
    }
  }

  if (!persona) {
    const { data: fallback } = await supabase
      .from("personas")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("ativo", true)
      .order("created_at", { ascending: true })
      .single();

    persona = (fallback as PersonaRow | null) ?? null;
  }

  return persona;
}

async function buildConversationSummary(supabase: AdminClient, tenantId: string, conversationId: string, msgCount: number) {
  if (msgCount <= 20) return "";

  const { data: existingSummary } = await supabase
    .from("conversation_summaries")
    .select("resumo")
    .eq("conversa_id", conversationId)
    .single();

  const summaryRow = existingSummary as { resumo?: string | null } | null;
  if (summaryRow?.resumo) {
    return `\n\nRESUMO DA CONVERSA ATUAL:\n${summaryRow.resumo}`;
  }

  const { data: allMsgs } = await supabase
    .from("mensagens")
    .select("remetente, conteudo")
    .eq("conversa_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(20);

  const summaryPrompt = `Resuma esta conversa em 3 linhas para contexto da IA:\n${((allMsgs ?? []) as MessageHistoryRow[]).map((message) => `${message.remetente}: ${message.conteudo}`).join("\n")}`;
  const summaryToken = await getVertexToken();
  const summary = await callGemini(summaryToken, [{ role: "user", parts: [{ text: summaryPrompt }] }], 0.3, 150);

  if (!summary) return "";

  await supabase.from("conversation_summaries").upsert({
    conversa_id: conversationId,
    tenant_id: tenantId,
    resumo: summary,
    mensagens_ate: msgCount,
  }, { onConflict: "conversa_id" });

  return `\n\nRESUMO DA CONVERSA ATUAL:\n${summary}`;
}

async function buildKnowledgeContext(supabase: AdminClient, tenantId: string, text: string) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return "";

  try {
    const embedRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://3cliques-crm.vercel.app"}/api/ai/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!embedRes.ok) return "";

    const embedData = (await embedRes.json()) as { embedding?: number[] };
    if (!embedData.embedding?.length) return "";

    const { data: kbResults } = await supabase.rpc("buscar_conhecimento", {
      p_tenant_id: tenantId,
      query_embedding: `[${embedData.embedding.join(",")}]`,
      match_count: 3,
      threshold: 0.55,
    });

    const articles = (kbResults ?? []) as Array<{ categoria?: string | null; titulo?: string | null; conteudo?: string | null }>;
    if (articles.length === 0) return "";

    return `\n\nCONHECIMENTO DISPONIVEL:\n${articles
      .map((article) => `[${article.categoria ?? "Geral"}] ${article.titulo ?? ""}: ${article.conteudo ?? ""}`)
      .join("\n\n")}`;
  } catch (error) {
    console.error("Knowledge context error:", error);
    return "";
  }
}

async function runAiReply(
  supabase: AdminClient,
  tenantId: string,
  canal: InboxIdentityInput["canal"],
  lead: LeadLike,
  conversation: ConversationLike,
  messageText: string,
  sender: SenderAdapter,
  activityType: AtividadeTipo,
  detectedIntent: IntentMatch | null,
) {
  const yearMonth = new Date().toISOString().slice(0, 7);
  const { data: tenantLimitsData } = await supabase
    .from("tenant_limits")
    .select("ai_calls_this_month, max_ai_calls_per_month, messages_this_month, reset_at")
    .eq("tenant_id", tenantId)
    .single();

  const tenantLimits = (tenantLimitsData as TenantLimitsRow | null) ?? null;

  if (tenantLimits?.reset_at && new Date(tenantLimits.reset_at) <= new Date()) {
    await supabase.from("tenant_limits").update({
      ai_calls_this_month: 0,
      messages_this_month: 0,
      reset_at: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("tenant_id", tenantId);

    tenantLimits.ai_calls_this_month = 0;
    tenantLimits.messages_this_month = 0;
  }

  const maxAi = tenantLimits?.max_ai_calls_per_month ?? 10000;
  if ((tenantLimits?.ai_calls_this_month ?? 0) >= maxAi) {
    return;
  }

  await bumpTenantMessageCount(supabase, tenantId, tenantLimits);

  const { data: tenantData } = await supabase
    .from("tenants")
    .select("plans(name)")
    .eq("id", tenantId)
    .single();

  const tenantPlan = tenantData as { plans?: { name?: string | null } | null } | null;
  const planName = tenantPlan?.plans?.name ?? "Starter";
  const limit = AI_LIMITS[planName] ?? 200;

  const { data: usage } = await supabase
    .from("ai_usage")
    .select("count")
    .eq("tenant_id", tenantId)
    .eq("year_month", yearMonth)
    .single();

  const usageRow = usage as { count?: number | null } | null;
  if ((usageRow?.count ?? 0) >= limit) {
    return;
  }

  const persona = await resolvePersonaForIntent(supabase, tenantId, detectedIntent?.intent ?? null);

  if (persona?.id) {
    await supabase.from("conversas").update({ persona_id: persona.id }).eq("id", conversation.id);
  }

  const { data: interactions } = await supabase
    .from("interaction_history")
    .select("tipo, resumo, created_at")
    .eq("lead_id", lead.id)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(5);

  const interactionContext = (interactions ?? []).length > 0
    ? `\n\nHISTORICO DO LEAD:\n${((interactions ?? []) as InteractionHistoryRow[]).reverse().map((item) => `- ${new Date(item.created_at).toLocaleDateString("pt-BR")}: ${item.resumo}`).join("\n")}`
    : "";

  const { count: msgCount } = await supabase
    .from("mensagens")
    .select("id", { count: "exact", head: true })
    .eq("conversa_id", conversation.id);

  const conversationSummary = await buildConversationSummary(supabase, tenantId, conversation.id, msgCount ?? 0);
  const knowledgeContext = await buildKnowledgeContext(supabase, tenantId, messageText);

  const systemPrompt = `${persona?.descricao ?? "Voce e um assistente de vendas simpatico e profissional."}${persona?.empresa ? ` Empresa: ${persona.empresa}.` : ""} Lead: ${lead.nome ?? "Lead"}. Responda de forma breve em portugues.${knowledgeContext}${interactionContext}${conversationSummary}`;

  await supabase.from("interaction_history").insert({
    tenant_id: tenantId,
    lead_id: lead.id,
    tipo: `${canal}_recebido`,
    resumo: messageText.length > 100 ? `${messageText.slice(0, 100)}...` : messageText,
  });

  const { data: history } = await supabase
    .from("mensagens")
    .select("remetente, conteudo")
    .eq("conversa_id", conversation.id)
    .order("created_at", { ascending: true })
    .limit(10);

  const contents = [
    { role: "user", parts: [{ text: systemPrompt }] },
    ...((history ?? []) as MessageHistoryRow[]).map((item) => ({
      role: item.remetente === "lead" ? "user" : "model",
      parts: [{ text: item.conteudo }],
    })),
  ];

  try {
    const vertexToken = await getVertexToken();
    const aiReply = await callGemini(vertexToken, contents, persona?.temperatura ?? 0.7, persona?.max_tokens ?? 300);

    if (!aiReply.trim()) {
      await handoffToHuman(
        supabase,
        tenantId,
        conversation.id,
        lead,
        messageText,
        activityType,
        "ia_low_confidence",
        "IA sem confianca - atendimento humano necessario",
      );
      return;
    }

    if (conversation.ai_mode === "copilot") {
      await supabase.from("conversas").update({ ai_suggestion: aiReply }).eq("id", conversation.id);
      await supabase.from("mensagens").insert({
        conversa_id: conversation.id,
        tenant_id: tenantId,
        remetente: "ia",
        conteudo: `[SUGESTAO] ${aiReply}`,
        enviada: false,
      });
    } else {
      await supabase.from("mensagens").insert({
        conversa_id: conversation.id,
        tenant_id: tenantId,
        remetente: "ia",
        conteudo: aiReply,
        enviada: false,
        metadata: { canal, direction: "outbound", source: "ai" },
      });

      if (persona?.responder_com_audio && sender.sendAudioBuffer) {
        const audioBuffer = await textToSpeech(aiReply, persona.voz_tts ?? "pt-BR-feminina");
        if (audioBuffer) {
          await sender.sendAudioBuffer(audioBuffer);
        } else {
          await sender.sendText(aiReply);
        }
      } else {
        await sender.sendText(aiReply);
      }

      await supabase
        .from("mensagens")
        .update({ enviada: true })
        .eq("conversa_id", conversation.id)
        .eq("remetente", "ia")
        .eq("enviada", false);
    }

    await supabase.from("ai_usage").upsert({
      tenant_id: tenantId,
      year_month: yearMonth,
      count: (usageRow?.count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id,year_month" });

    if (tenantLimits) {
      await supabase.from("tenant_limits").update({
        ai_calls_this_month: (tenantLimits.ai_calls_this_month ?? 0) + 1,
        updated_at: new Date().toISOString(),
      }).eq("tenant_id", tenantId);
    }

    await dispatchWebhook(tenantId, "message.sent", {
      lead_id: lead.id,
      lead_nome: lead.nome,
      mensagem: aiReply,
      canal,
      remetente: "ia",
    });
  } catch (error) {
    console.error("AI error:", error);
    await handoffToHuman(
      supabase,
      tenantId,
      conversation.id,
      lead,
      messageText,
      activityType,
      "ia_error",
      "Erro na IA - atendimento humano necessario",
    );
  }
}

export async function handleInboundAutomation(params: InboundAutomationParams) {
  const {
    supabase,
    tenantId,
    canal,
    identity,
    lead: leadInput,
    message,
    sender,
    activityType = canal === "whatsapp" ? "whatsapp" : canal === "email" ? "email" : "outro",
    channelHints,
  } = params;

  const ingested = await ingestInboundMessage({
    supabase,
    tenantId,
    canal,
    identity,
    lead: leadInput,
    message,
    channelHints,
  });

  if (ingested.duplicate || !ingested.lead || !ingested.conversation) {
    return ingested;
  }

  const lead = ingested.lead as LeadLike;
  const conversation = ingested.conversation as ConversationLike;
  const text = message.text?.trim() ?? "";

  const csatHandled = await checkAndHandleCsatReply(supabase, {
    id: conversation.id,
    tenant_id: tenantId,
    lead_id: lead.id,
    canal,
    aguardando_csat: conversation.aguardando_csat,
  }, text);
  if (csatHandled) return ingested;

  await dispatchWebhook(tenantId, "message.received", {
    lead_id: lead.id,
    lead_nome: lead.nome,
    conversa_id: conversation.id,
    mensagem: maskPII(text).masked,
    tipo: message.mediaType ?? "text",
    canal,
  });

  if (text) {
    try {
      const flowResult = await processFlowMessage({
        tenantId,
        conversaId: conversation.id,
        leadId: lead.id,
        lead,
        text,
        sendText: sender.sendText,
      });

      if (flowResult === "done" || flowResult === "waiting") {
        return { ...ingested, handledBy: "flow" as const };
      }
    } catch (error) {
      console.error("Flow engine error:", error);
    }
  }

  const detectedIntent = text ? detectIntent(text) : null;

  if (detectedIntent?.status && lead.status !== detectedIntent.status) {
    await supabase.from("leads").update({ status: detectedIntent.status }).eq("id", lead.id);
    await supabase.from("atividades").insert({
      tenant_id: tenantId,
      lead_id: lead.id,
      tipo: activityType,
      titulo: `IA: ${detectedIntent.label}`,
      concluida: true,
      concluida_em: new Date().toISOString(),
    });

    if (detectedIntent.status === "ganho") {
      await dispatchWebhook(tenantId, "lead.won", { lead_id: lead.id, lead_nome: lead.nome, status: "ganho" });
    } else if (detectedIntent.status === "perdido") {
      await dispatchWebhook(tenantId, "lead.lost", { lead_id: lead.id, lead_nome: lead.nome, status: "perdido" });
    } else {
      await dispatchWebhook(tenantId, "lead.status_changed", { lead_id: lead.id, lead_nome: lead.nome, status_novo: detectedIntent.status });
    }
  }

  if (detectedIntent?.intent === "humano" || (text && detectNegativeSentiment(text))) {
    const title = detectedIntent?.intent === "humano"
      ? "Lead pediu atendimento humano"
      : "Sentimento negativo detectado";

    await handoffToHuman(
      supabase,
      tenantId,
      conversation.id,
      lead,
      text || "[Mensagem sem texto]",
      activityType,
      detectedIntent?.intent === "humano" ? "handoff_ia" : "sentimento_negativo",
      title,
    );

    return { ...ingested, handledBy: "handoff" as const };
  }

  if ((conversation.ia_ativa || conversation.ai_mode !== "disabled") && conversation.ai_mode !== "disabled" && process.env.GOOGLE_SERVICE_ACCOUNT_JSON && text) {
    await runAiReply(
      supabase,
      tenantId,
      canal,
      lead,
      conversation,
      text,
      sender,
      activityType,
      detectedIntent,
    );
  }

  return { ...ingested, handledBy: "ai" as const };
}
