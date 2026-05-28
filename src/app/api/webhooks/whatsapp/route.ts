import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { GoogleAuth } from "google-auth-library";

const AI_LIMITS: Record<string, number> = {
  Starter: 200,
  Pro: 2000,
  Agency: Infinity,
};

const VERTEX_PROJECT = "adsliberty";
const VERTEX_LOCATION = "us-central1";
const VERTEX_MODEL = "gemini-2.0-flash";

function adminClient() {
  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

async function getVertexToken(): Promise<string> {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  return tokenResponse.token!;
}

async function callGeminiVertex(token: string, contents: any[]): Promise<string> {
  const url = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_MODEL}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 300 } }),
  });
  if (!res.ok) {
    console.error("Vertex AI error:", await res.text());
    return "";
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ─── GET: verificação do webhook pela Meta ───
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ─── POST: receber mensagens da Meta ───
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    if (!value || change?.field !== "messages") return NextResponse.json({ status: "ok" });

    const phoneNumberId: string = value.metadata?.phone_number_id;
    const messages: any[] = value.messages ?? [];
    if (!phoneNumberId || messages.length === 0) return NextResponse.json({ status: "ok" });

    const supabase = adminClient();

    const { data: waConfig } = await supabase
      .from("whatsapp_configs")
      .select("tenant_id, access_token, active")
      .eq("phone_number_id", phoneNumberId)
      .eq("active", true)
      .single();

    if (!waConfig) return NextResponse.json({ status: "ok" });
    const tenantId: string = waConfig.tenant_id;

    for (const msg of messages) {
      if (msg.type !== "text") continue;
      const fromNumber: string = msg.from;
      const text: string = msg.text?.body ?? "";
      const waMessageId: string = msg.id;

      // Evitar duplicatas
      const { data: existing } = await supabase.from("mensagens").select("id").eq("wa_message_id", waMessageId).single();
      if (existing) continue;

      // Buscar ou criar lead
      const normalizedPhone = fromNumber.replace(/^55/, "").replace(/\D/g, "");
      let { data: lead } = await supabase.from("leads").select("id, nome").eq("tenant_id", tenantId).ilike("whatsapp", `%${normalizedPhone}%`).single();
      if (!lead) {
        const { data: newLead } = await supabase.from("leads").insert({ tenant_id: tenantId, nome: `Lead ${fromNumber}`, whatsapp: fromNumber, status: "novo" }).select("id, nome").single();
        lead = newLead;
      }
      if (!lead) continue;

      // Buscar ou criar conversa
      let { data: conversa } = await supabase.from("conversas").select("id, ia_ativa").eq("tenant_id", tenantId).eq("lead_id", lead.id).eq("canal", "whatsapp").eq("status", "ativo").single();
      if (!conversa) {
        const { data: newConversa } = await supabase.from("conversas").insert({ tenant_id: tenantId, lead_id: lead.id, canal: "whatsapp", status: "ativo", ia_ativa: true }).select("id, ia_ativa").single();
        conversa = newConversa;
      }
      if (!conversa) continue;

      // Inserir mensagem do lead
      await supabase.from("mensagens").insert({ conversa_id: conversa.id, tenant_id: tenantId, remetente: "lead", conteudo: text, wa_message_id: waMessageId, enviada: true });
      await supabase.from("conversas").update({ updated_at: new Date().toISOString() }).eq("id", conversa.id);

      // IA com Vertex AI (Gemini) — verificar limite
      if (conversa.ia_ativa && process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        try {
          const yearMonth = new Date().toISOString().slice(0, 7);

          const { data: tenantData } = await supabase
            .from("tenants").select("plans(name)").eq("id", tenantId).single() as { data: any; error: unknown };
          const planName = tenantData?.plans?.name ?? "Starter";
          const limit = AI_LIMITS[planName] ?? 200;

          const { data: usage } = await supabase
            .from("ai_usage").select("count").eq("tenant_id", tenantId).eq("year_month", yearMonth).single() as { data: { count: number } | null; error: unknown };
          const currentCount = usage?.count ?? 0;

          if (currentCount >= limit) {
            console.log(`Tenant ${tenantId} atingiu limite IA: ${currentCount}/${limit}`);
            continue;
          }

          // Buscar histórico
          const { data: history } = await supabase
            .from("mensagens").select("remetente, conteudo").eq("conversa_id", conversa.id).order("created_at", { ascending: true }).limit(10);

          const contents = [
            { role: "user", parts: [{ text: `Você é um assistente de vendas. Responda de forma breve, simpática e profissional em português. Lead: ${lead.nome}.` }] },
            ...(history ?? []).map((m: any) => ({
              role: m.remetente === "lead" ? "user" : "model",
              parts: [{ text: m.conteudo }],
            })),
          ];

          const vertexToken = await getVertexToken();
          const aiReply = await callGeminiVertex(vertexToken, contents);

          if (aiReply) {
            await supabase.from("mensagens").insert({ conversa_id: conversa.id, tenant_id: tenantId, remetente: "ia", conteudo: aiReply, enviada: false });
            await sendWhatsAppMessage(waConfig.access_token, phoneNumberId, fromNumber, aiReply);
            await supabase.from("mensagens").update({ enviada: true }).eq("conversa_id", conversa.id).eq("remetente", "ia").eq("enviada", false);

            await supabase.from("ai_usage").upsert(
              { tenant_id: tenantId, year_month: yearMonth, count: currentCount + 1, updated_at: new Date().toISOString() },
              { onConflict: "tenant_id,year_month" }
            );
          }
        } catch (aiErr) {
          console.error("Vertex AI error:", aiErr);
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
