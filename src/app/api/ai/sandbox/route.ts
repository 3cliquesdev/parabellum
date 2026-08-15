import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";
import { assertTenantMember } from "@/lib/auth/guard";
import { consumeApiRateLimit } from "@/lib/security/rate-limit";

const VERTEX_PROJECT = "adsliberty";
const VERTEX_LOCATION = "us-central1";

interface SandboxRequestBody {
  tenant_id: string;
  message: string;
  history?: SandboxHistoryMessage[];
  kb_enabled?: boolean;
}

interface SandboxHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

interface PersonaRow {
  descricao?: string | null;
  empresa?: string | null;
  max_tokens?: number | null;
  temperatura?: number | null;
}

interface TrainingExampleRow {
  input_text: string;
  output_text: string;
  cenario?: string | null;
}

interface KnowledgeBaseArticle {
  titulo?: string | null;
  categoria?: string | null;
  conteudo?: string | null;
  similarity?: number | null;
}

interface VertexContentPart {
  text: string;
}

interface VertexContent {
  role: "user" | "model";
  parts: VertexContentPart[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isHistoryMessage(value: unknown): value is SandboxHistoryMessage {
  return (
    isRecord(value) &&
    (value.role === "user" || value.role === "assistant") &&
    typeof value.content === "string"
  );
}

function parseSandboxBody(value: unknown): SandboxRequestBody | null {
  if (!isRecord(value)) return null;
  if (typeof value.tenant_id !== "string" || typeof value.message !== "string") return null;

  const history = Array.isArray(value.history) ? value.history.filter(isHistoryMessage) : [];

  return {
    tenant_id: value.tenant_id,
    message: value.message,
    history,
    kb_enabled: typeof value.kb_enabled === "boolean" ? value.kb_enabled : true,
  };
}

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

  const data = (await res.json()) as {
    predictions?: Array<{
      embeddings?: {
        values?: number[];
      };
    }>;
  };

  return data.predictions?.[0]?.embeddings?.values ?? [];
}

export async function POST(request: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = parseSandboxBody(rawBody);
  if (!body) {
    return NextResponse.json({ error: "tenant_id e message são obrigatórios" }, { status: 400 });
  }

  const auth = await assertTenantMember(body.tenant_id);
  if (!auth.ok) return auth.response;
  if (!await consumeApiRateLimit(auth.admin, `ai:sandbox:${auth.user.id}`, 30, 60)) {
    return NextResponse.json({ error: "Limite de mensagens excedido. Aguarde um minuto." }, { status: 429 });
  }

  try {
    const admin = auth.admin;

    const { data: persona } = await admin
      .from("personas")
      .select("*")
      .eq("tenant_id", body.tenant_id)
      .limit(1)
      .maybeSingle();

    const currentPersona = persona as unknown as PersonaRow | null;

    const { data: examples } = await admin
      .from("training_examples")
      .select("input_text, output_text, cenario")
      .eq("tenant_id", body.tenant_id)
      .limit(10);

    let kbArticles: KnowledgeBaseArticle[] = [];
    let kbContext = "";

    if (body.kb_enabled) {
      try {
        const embedding = await embed(body.message);
        if (embedding.length > 0) {
          const { data: results } = await admin.rpc("buscar_conhecimento", {
            p_tenant_id: body.tenant_id,
            query_embedding: `[${embedding.join(",")}]`,
            match_count: 3,
            threshold: 0.55,
          });

          kbArticles = (results ?? []) as unknown as KnowledgeBaseArticle[];
          if (kbArticles.length > 0) {
            kbContext = `\n\nCONHECIMENTO DISPONÍVEL:\n${kbArticles
              .map((article) => `[${article.categoria ?? "Geral"}] ${article.titulo ?? ""}: ${article.conteudo ?? ""}`)
              .join("\n\n")}\n\nUse as informações acima quando relevante.`;
          }
        }
      } catch {
        // Conhecimento é opcional.
      }
    }

    const systemPrompt = `${currentPersona?.descricao ?? "Você é um assistente de vendas profissional. Responda de forma breve em português."}${currentPersona?.empresa ? ` Empresa: ${currentPersona.empresa}.` : ""}${kbContext}`;

    const fewShot = ((examples ?? []) as unknown as TrainingExampleRow[])
      .slice(0, 5)
      .flatMap((example) => ([
        { role: "user", parts: [{ text: example.input_text }] },
        { role: "model", parts: [{ text: example.output_text }] },
      ] satisfies VertexContent[]));

    const historyContents = body.history?.map((message) => ({
      role: message.role === "user" ? "user" : "model",
      parts: [{ text: message.content }],
    } satisfies VertexContent)) ?? [];

    const contents: VertexContent[] = [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Entendido. Posso ajudar!" }] },
      ...fewShot,
      ...historyContents,
      { role: "user", parts: [{ text: body.message }] },
    ];

    const token = await getToken();
    const url = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT}/locations/${VERTEX_LOCATION}/publishers/google/models/gemini-2.5-flash:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: Math.max(currentPersona?.max_tokens ?? 1000, 600),
          temperature: currentPersona?.temperatura ?? 0.7,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini error:", res.status, errText);
      return NextResponse.json({ error: `Gemini error ${res.status}: ${errText.slice(0, 200)}` }, { status: 500 });
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sem resposta.";

    return NextResponse.json({
      reply,
      kb_articles: kbArticles.map((article) => ({
        titulo: article.titulo,
        categoria: article.categoria,
        similarity: Math.round((article.similarity ?? 0) * 100),
      })),
    });
  } catch (error) {
    console.error("Sandbox error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Erro interno",
    }, { status: 500 });
  }
}
