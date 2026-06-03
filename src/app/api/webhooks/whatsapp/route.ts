import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { GoogleAuth } from "google-auth-library";
import { dispatchWebhook } from "@/lib/webhooks";
import { dispatchConversation } from "@/lib/dispatch";
import { processFlowMessage } from "@/lib/flow-engine";
import { ingestInboundMessage } from "@/lib/inbox/service";
import { transcribeAudio } from "@/lib/speech";
import { textToSpeech } from "@/lib/tts";

const AI_LIMITS: Record<string, number> = { Starter: 200, Pro: 2000, Agency: Infinity };
const VERTEX_PROJECT = "adsliberty";
const VERTEX_LOCATION = "us-central1";
const VERTEX_MODEL = "gemini-2.5-flash";

// Intenções detectáveis para mover leads no pipeline
const INTENT_PATTERNS: Record<string, { keywords: string[]; status: string | null; label: string }> = {
  comercial:  { keywords: ["preço", "valor", "quanto custa", "plano", "contratar", "serviço", "interesse"], status: "qualificado", label: "Qualificado pela IA" },
  proposta:   { keywords: ["proposta", "orçamento", "detalhes", "informações", "quero saber mais"], status: "proposta", label: "Pediu proposta" },
  fechamento: { keywords: ["fechar", "contratar", "quero", "comprar", "aceito", "vamos lá", "pode confirmar"], status: "ganho", label: "Lead fechado pela IA" },
  desistencia:{ keywords: ["não quero", "desistir", "cancelar", "não preciso", "dispensado"], status: "perdido", label: "Desistiu" },
  humano:     { keywords: ["humano", "atendente", "pessoa", "falar com alguém", "suporte"], status: null, label: "Pediu humano" },
};

// Palavras de sentimento negativo para handoff
const NEGATIVE_WORDS = ["problema", "errado", "péssimo", "horrível", "absurdo", "insatisfeito", "reclamação", "não funciona", "frustrado"];

function adminClient() {
  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

async function getVertexToken(): Promise<string> {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  const auth = new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  return tokenResponse.token!;
}

async function callGemini(token: string, contents: any[], temperatura: number = 0.7, maxTokens: number = 1000): Promise<string> {
  const url = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_MODEL}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: maxTokens, temperature: temperatura } }),
  });
  if (!res.ok) { console.error("Vertex error:", await res.text()); return ""; }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function detectIntent(text: string): { intent: string; status: string | null; label: string } | null {
  const lower = text.toLowerCase();
  for (const [intent, { keywords, status, label }] of Object.entries(INTENT_PATTERNS)) {
    if (keywords.some(k => lower.includes(k))) return { intent, status, label };
  }
  return null;
}

function detectNegativeSentiment(text: string): boolean {
  const lower = text.toLowerCase();
  return NEGATIVE_WORDS.some(w => lower.includes(w));
}

// ─── GET: verificação do webhook ───
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("hub.mode") === "subscribe" && searchParams.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(searchParams.get("hub.challenge"), { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ─── POST: receber mensagens ───
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const value = body?.entry?.[0]?.changes?.[0]?.value;
    if (!value || body?.entry?.[0]?.changes?.[0]?.field !== "messages") return NextResponse.json({ status: "ok" });

    const phoneNumberId: string = value.metadata?.phone_number_id;
    const messages: any[] = value.messages ?? [];
    if (!phoneNumberId || !messages.length) return NextResponse.json({ status: "ok" });

    const supabase = adminClient();
    const { data: waConfig } = await supabase
      .from("whatsapp_configs").select("tenant_id, access_token, active")
      .eq("phone_number_id", phoneNumberId).eq("active", true).single();
    if (!waConfig) return NextResponse.json({ status: "ok" });

    const tenantId: string = waConfig.tenant_id;

    for (const msg of messages) {
      const SUPPORTED = ["text","image","audio","video","document","sticker","location","voice"];
      if (!SUPPORTED.includes(msg.type)) continue;

      const fromNumber: string = msg.from;
      const waMessageId: string = msg.id;

      // Processar conteúdo e mídia
      let text = "";
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;
      let mediaNome: string | null = null;
      let mediaMime: string | null = null;
      let mediaCaption: string | null = null;
      let lat: number | null = null;
      let lng: number | null = null;

      if (msg.type === "text") {
        text = msg.text?.body ?? "";
      } else if (msg.type === "location") {
        lat = msg.location?.latitude ?? null;
        lng = msg.location?.longitude ?? null;
        text = `[Localização] ${msg.location?.name ?? ""}`.trim();
        mediaType = "location";
      } else {
        const mediaData = msg[msg.type] ?? msg.voice ?? msg.audio ?? {};
        text = mediaData.caption || `[${msg.type}]`;
        mediaCaption = mediaData.caption || null;
        mediaNome = mediaData.filename || null;
        mediaMime = mediaData.mime_type || null;
        mediaType = msg.type === "voice" ? "audio" : msg.type;
        if (mediaData.id) {
          try {
            const stored = await fetchAndStoreMedia(mediaData.id, waConfig.access_token, tenantId, supabase);
            mediaUrl = stored;
            // STT: transcrever áudios para que a IA entenda o conteúdo
            if ((msg.type === "audio" || msg.type === "voice") && stored) {
              const transcription = await transcribeAudio(stored, mediaMime);
              if (transcription) text = `[Áudio transcrito]: ${transcription}`;
            }
          } catch (e) { console.error("Media fetch error:", e); }
        }
      }

      // Dedup
      const ingested = await ingestInboundMessage({
        supabase,
        tenantId,
        canal: "whatsapp",
        identity: {
          canal: "whatsapp",
          value: fromNumber,
        },
        lead: {
          name: `Lead ${fromNumber}`,
        },
        message: {
          externalMessageId: waMessageId,
          waMessageId,
          text,
          mediaUrl,
          mediaType: mediaType as "image" | "audio" | "video" | "document" | "sticker" | "location" | null,
          mediaName: mediaNome,
          mediaMime,
          mediaCaption,
          latitude: lat,
          longitude: lng,
          metadata: {
            canal: "whatsapp",
            direction: "inbound",
            message_type: msg.type,
          },
        },
      });
      if (ingested.duplicate || !ingested.lead || !ingested.conversation) continue;

      // Buscar/criar lead
      const lead = ingested.lead;

      // Buscar/criar conversa
      const conversa = ingested.conversation;
      if (!conversa) continue;

      // Salvar mensagem do lead (com mídia se houver)

      // Dispatch webhook: mensagem recebida
      dispatchWebhook(tenantId, "message.received", {
        lead_id: lead.id, lead_nome: lead.nome,
        mensagem: text, tipo: msg.type,
      });

      // ─── Chat Flow Engine — processa antes da IA padrão ───
      if (msg.type === "text" && text) {
        try {
          const flowResult = await processFlowMessage({
            tenantId, conversaId: conversa.id, leadId: lead.id, lead,
            text, accessToken: waConfig.access_token,
            phoneNumberId, toNumber: fromNumber,
          });
          if (flowResult === "done" || flowResult === "waiting") continue;
        } catch (flowErr) {
          console.error("Flow engine error:", flowErr);
          // Continue com IA padrão se flow falhar
        }
      }

      // Detectar intenção → mover pipeline
      const intent = detectIntent(text);
      if (intent?.status && lead.status !== intent.status) {
        await supabase.from("leads").update({ status: intent.status }).eq("id", lead.id);
        await supabase.from("atividades").insert({
          tenant_id: tenantId, lead_id: lead.id, tipo: "whatsapp",
          titulo: `IA: ${intent.label}`, concluida: true, concluida_em: new Date().toISOString(),
        });

        // Dispatch webhook: status mudou
        if (intent.status === "ganho") {
          dispatchWebhook(tenantId, "lead.won", { lead_id: lead.id, lead_nome: lead.nome, status: "ganho" });
        } else if (intent.status === "perdido") {
          dispatchWebhook(tenantId, "lead.lost", { lead_id: lead.id, lead_nome: lead.nome, status: "perdido" });
        } else {
          dispatchWebhook(tenantId, "lead.status_changed", { lead_id: lead.id, lead_nome: lead.nome, status_novo: intent.status });
        }
      }

      // Handoff: lead pediu humano ou sentimento negativo → round-robin dispatch
      if (intent?.intent === "humano" || detectNegativeSentiment(text)) {
        const isNegativo = detectNegativeSentiment(text);
        const motivo = intent?.intent === "humano" ? "handoff_ia" : "sentimento_negativo";

        // Determinar departamento pelo intent
        const INTENTS_SUPORTE = ["suporte"];
        const deptAlvo = INTENTS_SUPORTE.includes(intent?.intent ?? "") ? "suporte" : "vendas";

        // Dispatcher round-robin
        const dispatch = await dispatchConversation(tenantId, conversa.id, deptAlvo, motivo);

        await supabase.from("atividades").insert({
          tenant_id: tenantId, lead_id: lead.id, tipo: "whatsapp",
          titulo: dispatch.atribuido
            ? `Atribuído para atendimento humano (${deptAlvo})`
            : intent?.intent === "humano" ? "Lead pediu atendimento humano — na fila" : "Sentimento negativo — na fila",
          descricao: `Última mensagem: "${text}"${dispatch.na_fila ? " | Sem agentes disponíveis, adicionado à fila." : ""}`,
          prazo: new Date().toISOString(), concluida: false,
        });
        continue; // Não responde com IA
      }

      // IA apenas se autopilot ou copilot + Gemini disponível
      if ((conversa.ia_ativa || conversa.ai_mode !== "disabled") && conversa.ai_mode !== "disabled" && process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        try {
          const yearMonth = new Date().toISOString().slice(0, 7);

          // ─── Verificar e atualizar limites da agência (tenant_limits) ───
          const { data: tenantLimits } = await supabase
            .from("tenant_limits")
            .select("ai_calls_this_month, max_ai_calls_per_month, messages_this_month, reset_at")
            .eq("tenant_id", tenantId).single() as { data: any };

          if (tenantLimits) {
            // Reset mensal automático
            if (tenantLimits.reset_at && new Date(tenantLimits.reset_at) <= new Date()) {
              await supabase.from("tenant_limits").update({
                ai_calls_this_month: 0,
                messages_this_month: 0,
                reset_at: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
                updated_at: new Date().toISOString(),
              }).eq("tenant_id", tenantId);
              tenantLimits.ai_calls_this_month = 0;
            }
            // Bloquear se limite de IA atingido
            const maxAi = tenantLimits.max_ai_calls_per_month ?? 10000;
            if ((tenantLimits.ai_calls_this_month ?? 0) >= maxAi) {
              console.log(`Tenant ${tenantId} atingiu limite de IA (${maxAi} chamadas/mês)`);
              continue;
            }
          }

          // Incrementar mensagem recebida
          await supabase.from("tenant_limits").upsert({
            tenant_id: tenantId,
            messages_this_month: (tenantLimits?.messages_this_month ?? 0) + 1,
            updated_at: new Date().toISOString(),
          }, { onConflict: "tenant_id" });

          // Verificar limite do plano legacy (ai_usage)
          const { data: tenantData } = await supabase.from("tenants").select("plans(name)").eq("id", tenantId).single() as { data: any; error: unknown };
          const planName = tenantData?.plans?.name ?? "Starter";
          const limit = AI_LIMITS[planName] ?? 200;
          const { data: usage } = await supabase.from("ai_usage").select("count").eq("tenant_id", tenantId).eq("year_month", yearMonth).single() as { data: { count: number } | null; error: unknown };
          if ((usage?.count ?? 0) >= limit) continue;

          // ─── Roteamento: encontrar o agente certo pela intenção ───
          let persona: any = null;
          if (intent?.intent) {
            // Busca regra que inclui essa intenção
            const { data: rule } = await supabase
              .from("agent_routing_rules")
              .select("*, personas(*)")
              .eq("tenant_id", tenantId).eq("ativo", true)
              .contains("intents", [intent.intent])
              .order("priority", { ascending: false })
              .single() as { data: any; error: unknown };
            if (rule?.personas) persona = rule.personas;
          }
          // Fallback: primeira persona ativa
          if (!persona) {
            const { data: fallback } = await supabase.from("personas").select("*")
              .eq("tenant_id", tenantId).eq("ativo", true)
              .order("created_at", { ascending: true }).single() as { data: any; error: unknown };
            persona = fallback;
          }

          // Salvar agente ativo na conversa
          if (persona?.id) {
            await supabase.from("conversas").update({ persona_id: persona.id }).eq("id", conversa.id);
          }

          // ─── Memória longa: histórico de interações do lead ───
          const { data: interactions } = await supabase
            .from("interaction_history")
            .select("tipo, resumo, created_at")
            .eq("lead_id", lead.id).eq("tenant_id", tenantId)
            .order("created_at", { ascending: false }).limit(5) as { data: any[]; error: unknown };

          const interactionContext = (interactions ?? []).length > 0
            ? `\n\nHISTÓRICO DO LEAD:\n${(interactions ?? []).reverse().map((i: any) =>
                `- ${new Date(i.created_at).toLocaleDateString("pt-BR")}: ${i.resumo}`
              ).join("\n")}`
            : "";

          // ─── Memória curta: resumo da conversa (se > 20 msgs) ───
          const { count: msgCount } = await supabase.from("mensagens")
            .select("id", { count: "exact", head: true }).eq("conversa_id", conversa.id) as any;

          let conversaSummary = "";
          if ((msgCount ?? 0) > 20) {
            const { data: existingSummary } = await supabase.from("conversation_summaries")
              .select("resumo").eq("conversa_id", conversa.id).single() as { data: any; error: unknown };
            if (existingSummary?.resumo) {
              conversaSummary = `\n\nRESUMO DA CONVERSA ATUAL:\n${existingSummary.resumo}`;
            } else {
              // Gerar resumo automaticamente
              const resumoToken = await getVertexToken();
              const { data: allMsgs } = await supabase.from("mensagens")
                .select("remetente, conteudo").eq("conversa_id", conversa.id)
                .order("created_at", { ascending: true }).limit(20);
              const resumoPrompt = `Resuma esta conversa em 3 linhas para contexto da IA:\n${(allMsgs ?? []).map((m: any) => `${m.remetente}: ${m.conteudo}`).join("\n")}`;
              const resumo = await callGemini(resumoToken, [{ role: "user", parts: [{ text: resumoPrompt }] }], 0.3, 150);
              if (resumo) {
                await supabase.from("conversation_summaries").upsert({ conversa_id: conversa.id, tenant_id: tenantId, resumo, mensagens_ate: msgCount ?? 0 }, { onConflict: "conversa_id" });
                conversaSummary = `\n\nRESUMO DA CONVERSA ATUAL:\n${resumo}`;
              }
            }
          }

          // ─── System prompt com persona + memória ───
          const systemPrompt = `${persona?.descricao ?? "Você é um assistente de vendas simpático e profissional."}${persona?.empresa ? ` Empresa: ${persona.empresa}.` : ""} Lead: ${lead.nome}. Responda de forma breve em português.${interactionContext}${conversaSummary}`;

          // Registrar interação no histórico (memória longa)
          await supabase.from("interaction_history").insert({
            tenant_id: tenantId, lead_id: lead.id,
            tipo: "whatsapp_recebido",
            resumo: text.length > 100 ? text.substring(0, 100) + "..." : text,
          });

          // Histórico da conversa (contexto imediato)
          const { data: history } = await supabase.from("mensagens")
            .select("remetente, conteudo").eq("conversa_id", conversa.id)
            .order("created_at", { ascending: true }).limit(10);

          const contents = [
            { role: "user", parts: [{ text: systemPrompt }] },
            ...(history ?? []).map((m: any) => ({
              role: m.remetente === "lead" ? "user" : "model",
              parts: [{ text: m.conteudo }],
            })),
          ];

          const vertexToken = await getVertexToken();
          const aiReply = await callGemini(vertexToken, contents, persona?.temperatura ?? 0.7, persona?.max_tokens ?? 300);

          if (aiReply) {
            if (conversa.ai_mode === "copilot") {
              // Copilot: salva sugestão sem enviar
              await supabase.from("conversas").update({ ai_suggestion: aiReply }).eq("id", conversa.id);
              await supabase.from("mensagens").insert({ conversa_id: conversa.id, tenant_id: tenantId, remetente: "ia", conteudo: `[SUGESTÃO] ${aiReply}`, enviada: false });
            } else {
              // Autopilot: salva no banco
              await supabase.from("mensagens").insert({ conversa_id: conversa.id, tenant_id: tenantId, remetente: "ia", conteudo: aiReply, enviada: false });

              // TTS: responder com áudio se persona configurada para isso
              if (persona?.responder_com_audio) {
                try {
                  const audioBuffer = await textToSpeech(aiReply, persona.voz_tts ?? "pt-BR-feminina");
                  if (audioBuffer) {
                    // Salvar no Supabase Storage
                    const audioPath = `${tenantId}/tts-${Date.now()}.mp3`;
                    await supabase.storage.from("media").upload(audioPath, audioBuffer, { contentType: "audio/mpeg" });
                    const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(audioPath);
                    // Enviar como áudio no WhatsApp
                    await sendWhatsAppAudio(waConfig.access_token, phoneNumberId, fromNumber, audioBuffer);
                  } else {
                    await sendWhatsAppMessage(waConfig.access_token, phoneNumberId, fromNumber, aiReply);
                  }
                } catch (ttsErr) {
                  console.error("TTS error, fallback to text:", ttsErr);
                  await sendWhatsAppMessage(waConfig.access_token, phoneNumberId, fromNumber, aiReply);
                }
              } else {
                await sendWhatsAppMessage(waConfig.access_token, phoneNumberId, fromNumber, aiReply);
              }

              await supabase.from("mensagens").update({ enviada: true }).eq("conversa_id", conversa.id).eq("remetente", "ia").eq("enviada", false);
            }

            // Atualizar contadores de uso
            const currentCount = usage?.count ?? 0;
            await supabase.from("ai_usage").upsert(
              { tenant_id: tenantId, year_month: yearMonth, count: currentCount + 1, updated_at: new Date().toISOString() },
              { onConflict: "tenant_id,year_month" }
            );
            // Incrementar tenant_limits.ai_calls_this_month
            if (tenantLimits) {
              await supabase.from("tenant_limits").update({
                ai_calls_this_month: (tenantLimits.ai_calls_this_month ?? 0) + 1,
                updated_at: new Date().toISOString(),
              }).eq("tenant_id", tenantId);
            }
          }
        } catch (aiErr) {
          console.error("AI error:", aiErr);
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function sendWhatsAppMessage(accessToken: string, phoneNumberId: string, to: string, text: string) {
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
  });
  if (!res.ok) console.error("WhatsApp send error:", await res.text());
}

async function sendWhatsAppAudio(accessToken: string, phoneNumberId: string, to: string, audioBuffer: Buffer) {
  // 1. Upload do áudio para a Meta API
  const form = new FormData();
  const blob = new Blob([audioBuffer.buffer as ArrayBuffer], { type: "audio/mpeg" });
  form.append("messaging_product", "whatsapp");
  form.append("type", "audio/mpeg");
  form.append("file", blob, "resposta.mp3");

  const uploadRes = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!uploadRes.ok) { console.error("WA audio upload error:", await uploadRes.text()); return; }
  const { id: mediaId } = await uploadRes.json();

  // 2. Enviar mensagem de áudio
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "audio", audio: { id: mediaId } }),
  });
  if (!res.ok) console.error("WA send audio error:", await res.text());
}

async function fetchAndStoreMedia(mediaId: string, accessToken: string, tenantId: string, supabase: any): Promise<string> {
  // 1. Obter URL temporária da Meta
  const metaRes = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!metaRes.ok) throw new Error(`Meta media info failed: ${metaRes.status}`);
  const { url, mime_type } = await metaRes.json();

  // 2. Baixar o arquivo
  const fileRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!fileRes.ok) throw new Error(`Media download failed: ${fileRes.status}`);
  const buffer = await fileRes.arrayBuffer();

  // 3. Determinar extensão pelo mime type
  const ext: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
    "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a",
    "video/mp4": "mp4", "application/pdf": "pdf",
  };
  const extension = ext[mime_type] ?? "bin";
  const fileName = `${tenantId}/${mediaId}.${extension}`;

  // 4. Upload para Supabase Storage
  const { error } = await supabase.storage.from("whatsapp-media")
    .upload(fileName, buffer, { contentType: mime_type, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  // 5. Retornar URL pública
  const { data } = supabase.storage.from("whatsapp-media").getPublicUrl(fileName);
  return data.publicUrl;
}
