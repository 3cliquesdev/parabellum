import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";
import { createAdminClient, getSessionUser } from "@/lib/auth/guard";
import { consumeApiRateLimit } from "@/lib/security/rate-limit";

const VERTEX_PROJECT = "adsliberty";
const VERTEX_LOCATION = "us-central1";
const EMBED_MODEL = "text-embedding-004";
const MAX_EMBED_TEXT_LENGTH = 20_000;

interface EmbedRequestBody {
  text?: string;
}

interface VertexPredictionResponse {
  predictions?: Array<{
    embeddings?: {
      values?: number[];
    };
  }>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

async function getVertexToken(): Promise<string> {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  const auth = new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token!;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const token = await getVertexToken();
  const url = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT}/locations/${VERTEX_LOCATION}/publishers/google/models/${EMBED_MODEL}:predict`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ instances: [{ content: text, task_type: "SEMANTIC_SIMILARITY" }] }),
  });

  if (!response.ok) throw new Error(`Embedding failed: ${await response.text()}`);

  const data = (await response.json()) as VertexPredictionResponse;
  return data.predictions?.[0]?.embeddings?.values ?? [];
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as EmbedRequestBody;
  if (!body.text) return NextResponse.json({ error: "text required" }, { status: 400 });
  if (body.text.length > MAX_EMBED_TEXT_LENGTH) {
    return NextResponse.json({ error: "text excede o limite permitido" }, { status: 413 });
  }
  const rateLimitAdmin = createAdminClient();
  if (!await consumeApiRateLimit(rateLimitAdmin, `ai:embed:${user.id}`, 30, 60)) {
    return NextResponse.json({ error: "Limite de embeddings excedido. Aguarde um minuto." }, { status: 429 });
  }

  try {
    const embedding = await generateEmbedding(body.text);
    return NextResponse.json({ embedding, dimensions: embedding.length });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

// Os endpoints que gravavam embedding em knowledge_base (POST com article_id,
// GET em lote) foram removidos: os embeddings de knowledge_base agora sao
// gerados via OpenAI (workflow n8n "Backfill Embeddings Base Conhecimento",
// espaco vetorial diferente do Vertex text-embedding-004 usado aqui). Gravar
// um vetor Vertex nessa coluna corromperia silenciosamente a busca semantica
// do agente, ja que cosine similarity so faz sentido dentro do mesmo modelo.

export { generateEmbedding };
