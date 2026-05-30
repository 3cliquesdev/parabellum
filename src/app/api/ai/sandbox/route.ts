import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { GoogleAuth } from "google-auth-library";

const VERTEX_PROJECT = "adsliberty";
const VERTEX_LOCATION = "us-central1";

async function getToken() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  const auth = new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = await auth.getClient();
  return (await client.getAccessToken()).token!;
}

async function embed(text: string): Promise<number[]> {
  const token = await getToken();
  const url = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT}/locations/${VERTEX_LOCATION}/publishers/google/models/text-embedding-004:predict`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ instances: [{ content: text, task_type: "SEMANTIC_SIMILARITY" }] }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.predictions?.[0]?.embeddings?.values ?? [];
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { tenant_id, message, history = [], kb_enabled = true } = body;

  if (!tenant_id || !message) return NextResponse.json({ error: "tenant_id e message são obrigatórios" }, { status: 400 });

  try {

  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // Buscar persona (sem filtro ativo — campo pode não existir)
  const { data: persona } = await admin.from("personas").select("*").eq("tenant_id", tenant_id).limit(1).maybeSingle() as { data: any; error: unknown };

  // Buscar exemplos de treinamento
  const { data: examples } = await admin.from("training_examples").select("input_text, output_text, cenario")
    .eq("tenant_id", tenant_id).limit(10);

  // RAG: buscar KB
  let kbArticles: any[] = [];
  let kbContext = "";
  if (kb_enabled) {
    try {
      const embedding = await embed(message);
      if (embedding.length > 0) {
        const { data: results } = await admin.rpc("buscar_conhecimento", {
          p_tenant_id: tenant_id,
          query_embedding: `[${embedding.join(",")}]`,
          match_count: 3,
          threshold: 0.55,
        });
        kbArticles = results ?? [];
        if (kbArticles.length > 0) {
          kbContext = `\n\nCONHECIMENTO DISPONÍVEL:\n${kbArticles.map((a: any) => `[${a.categoria}] ${a.titulo}: ${a.conteudo}`).join("\n\n")}\n\nUse as informações acima quando relevante.`;
        }
      }
    } catch { /* kb optional */ }
  }

  // Montar system prompt
  const systemPrompt = `${persona?.descricao ?? "Você é um assistente de vendas profissional. Responda de forma breve em português."}${persona?.empresa ? ` Empresa: ${persona.empresa}.` : ""}${kbContext}`;

  // Few-shot examples
  const fewShot = (examples ?? []).slice(0, 5).map((e: any) => ([
    { role: "user", parts: [{ text: e.input_text }] },
    { role: "model", parts: [{ text: e.output_text }] },
  ])).flat();

  // Histórico da conversa
  const historyContents = history.map((m: any) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  const contents = [
    { role: "user", parts: [{ text: systemPrompt }] },
    { role: "model", parts: [{ text: "Entendido. Posso ajudar!" }] },
    ...fewShot,
    ...historyContents,
    { role: "user", parts: [{ text: message }] },
  ];

  // Chamar Gemini
  const token = await getToken();
  const url = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT}/locations/${VERTEX_LOCATION}/publishers/google/models/gemini-2.5-flash:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: Math.max(persona?.max_tokens ?? 1000, 600), temperature: persona?.temperatura ?? 0.7 } }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Gemini error:", res.status, errText);
    return NextResponse.json({ error: `Gemini error ${res.status}: ${errText.slice(0, 200)}` }, { status: 500 });
  }
  const data = await res.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sem resposta.";

  return NextResponse.json({ reply, kb_articles: kbArticles.map((a: any) => ({ titulo: a.titulo, categoria: a.categoria, similarity: Math.round(a.similarity * 100) })) });

  } catch (err: any) {
    console.error("Sandbox error:", err);
    return NextResponse.json({ error: err?.message ?? "Erro interno" }, { status: 500 });
  }
}
