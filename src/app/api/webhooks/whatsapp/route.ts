import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { GoogleAuth } from "google-auth-library";

const AI_LIMITS: Record<string, number> = { Starter: 200, Pro: 2000, Agency: Infinity };
const VERTEX_PROJECT = "adsliberty";
const VERTEX_LOCATION = "us-central1";
const VERTEX_MODEL = "gemini-2.0-flash";

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

async function callGemini(token: string, contents: any[], temperatura: number = 0.7, maxTokens: number = 300): Promise<string> {
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
          } catch (e) { console.error("Media fetch error:", e); }
        }
      }

      // Dedup
      const { data: existing } = await supabase.from("mensagens").select("id").eq("wa_message_id", waMessageId).single();
      if (existing) continue;

      // Buscar/criar lead
      const normalizedPhone = fromNumber.replace(/^55/, "").replace(/\D/g, "");
      let { data: lead } = await supabase.from("leads").select("id, nome, status")
        .eq("tenant_id", tenantId).ilike("whatsapp", `%${normalizedPhone}%`).single();
      if (!lead) {
        const { data: newLead } = await supabase.from("leads")
          .insert({ tenant_id: tenantId, nome: `Lead ${fromNumber}`, whatsapp: fromNumber, status: "novo" })
          .select("id, nome, status").single();
        lead = newLead;
      }
      if (!lead) continue;

      // Buscar/criar conversa
      let { data: conversa } = await supabase.from("conversas")
        .select("id, ia_ativa, ai_mode").eq("tenant_id", tenantId).eq("lead_id", lead.id)
        .eq("canal", "whatsapp").eq("status", "ativo").single();
      if (!conversa) {
        const { data: newC } = await supabase.from("conversas")
          .insert({ tenant_id: tenantId, lead_id: lead.id, canal: "whatsapp", status: "ativo", ia_ativa: true, ai_mode: "autopilot" })
          .select("id, ia_ativa, ai_mode").single();
        conversa = newC;
      }
      if (!conversa) continue;

      // Salvar mensagem do lead (com mídia se houver)
      await supabase.from("mensagens").insert({
        conversa_id: conversa.id, tenant_id: tenantId, remetente: "lead",
        conteudo: text, wa_message_id: waMessageId, enviada: true,
        media_url: mediaUrl, media_type: mediaType, media_nome: mediaNome,
        media_mime: mediaMime, media_caption: mediaCaption,
        latitude: lat, longitude: lng,
      });
      await supabase.from("conversas").update({ updated_at: new Date().toISOString() }).eq("id", conversa.id);

      // Detectar intenção → mover pipeline
      const intent = detectIntent(text);
      if (intent?.status && lead.status !== intent.status) {
        await supabase.from("leads").update({ status: intent.status }).eq("id", lead.id);
        await supabase.from("atividades").insert({
          tenant_id: tenantId, lead_id: lead.id, tipo: "whatsapp",
          titulo: `IA: ${intent.label}`, concluida: true, concluida_em: new Date().toISOString(),
        });
      }

      // Handoff: lead pediu humano ou sentimento negativo
      if (intent?.intent === "humano" || detectNegativeSentiment(text)) {
        await supabase.from("conversas").update({ ai_mode: "disabled", ia_ativa: false }).eq("id", conversa.id);
        await supabase.from("atividades").insert({
          tenant_id: tenantId, lead_id: lead.id, tipo: "whatsapp",
          titulo: intent?.intent === "humano" ? "Lead pediu atendimento humano" : "Sentimento negativo detectado — atenção necessária",
          descricao: `Última mensagem: "${text}"`,
          prazo: new Date().toISOString(), concluida: false,
        });
        continue; // Não responde com IA
      }

      // IA apenas se autopilot ou copilot + Gemini disponível
      if ((conversa.ia_ativa || conversa.ai_mode !== "disabled") && conversa.ai_mode !== "disabled" && process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        try {
          const yearMonth = new Date().toISOString().slice(0, 7);

          // Verificar limite do plano
          const { data: tenantData } = await supabase.from("tenants").select("plans(name)").eq("id", tenantId).single() as { data: any; error: unknown };
          const planName = tenantData?.plans?.name ?? "Starter";
          const limit = AI_LIMITS[planName] ?? 200;
          const { data: usage } = await supabase.from("ai_usage").select("count").eq("tenant_id", tenantId).eq("year_month", yearMonth).single() as { data: { count: number } | null; error: unknown };
          if ((usage?.count ?? 0) >= limit) continue;

          // Buscar persona do tenant
          const { data: persona } = await supabase.from("personas").select("*").eq("tenant_id", tenantId).eq("ativo", true).single() as { data: any; error: unknown };

          const systemPrompt = persona?.descricao
            ? `${persona.descricao}${persona.empresa ? ` Empresa: ${persona.empresa}.` : ""} Lead: ${lead.nome}. Responda de forma breve em português.`
            : `Você é um assistente de vendas simpático e profissional. Lead: ${lead.nome}. Responda de forma breve em português.`;

          // Histórico da conversa
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
              // Autopilot: envia normalmente
              await supabase.from("mensagens").insert({ conversa_id: conversa.id, tenant_id: tenantId, remetente: "ia", conteudo: aiReply, enviada: false });
              await sendWhatsAppMessage(waConfig.access_token, phoneNumberId, fromNumber, aiReply);
              await supabase.from("mensagens").update({ enviada: true }).eq("conversa_id", conversa.id).eq("remetente", "ia").eq("enviada", false);
            }

            // Atualizar contador de uso
            const currentCount = usage?.count ?? 0;
            await supabase.from("ai_usage").upsert(
              { tenant_id: tenantId, year_month: yearMonth, count: currentCount + 1, updated_at: new Date().toISOString() },
              { onConflict: "tenant_id,year_month" }
            );
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
