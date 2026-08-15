import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";
import {
  assertTenantMember,
  createAdminClient,
  getSessionUser,
} from "@/lib/auth/guard";
import { consumeApiRateLimit } from "@/lib/security/rate-limit";

const VERTEX_PROJECT = "adsliberty";
const VERTEX_LOCATION = "us-central1";
const EMBED_MODEL = "text-embedding-004";
const MAX_EMBED_TEXT_LENGTH = 20_000;
const MAX_BATCH_ARTICLES = 100;

interface EmbedRequestBody {
  text?: string;
  article_id?: string;
}

interface VertexPredictionResponse {
  predictions?: Array<{
    embeddings?: {
      values?: number[];
    };
  }>;
}

interface KnowledgeBaseArticleRow {
  id: string;
  titulo: string | null;
  conteudo: string | null;
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

    if (body.article_id) {
      const admin = createAdminClient();
      const { data: article } = await admin
        .from("knowledge_base")
        .select("tenant_id")
        .eq("id", body.article_id)
        .maybeSingle();
      const tenantId = (article as { tenant_id?: string } | null)?.tenant_id;
      if (!tenantId) return NextResponse.json({ error: "Artigo nao encontrado" }, { status: 404 });

      const auth = await assertTenantMember(tenantId);
      if (!auth.ok) return auth.response;
      await auth.admin
        .from("knowledge_base")
        .update({ embedding: `[${embedding.join(",")}]` })
        .eq("id", body.article_id)
        .eq("tenant_id", tenantId);
    }

    return NextResponse.json({ embedding, dimensions: embedding.length });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await assertTenantMember(tenantId);
  if (!auth.ok) return auth.response;
  const admin = auth.admin;
  if (!await consumeApiRateLimit(admin, `ai:embed-batch:${auth.user.id}`, 3, 600)) {
    return NextResponse.json({ error: "Limite de processamento em lote excedido." }, { status: 429 });
  }
  const { data: articles } = await admin
    .from("knowledge_base")
    .select("id, titulo, conteudo")
    .eq("tenant_id", tenantId)
    .is("embedding", null)
    .limit(MAX_BATCH_ARTICLES);

  let processed = 0;
  let errors = 0;

  for (const article of ((articles ?? []) as unknown as KnowledgeBaseArticleRow[])) {
    try {
      const text = `${article.titulo ?? ""}\n\n${article.conteudo ?? ""}`.trim();
      const embedding = await generateEmbedding(text);
      await admin
        .from("knowledge_base")
        .update({ embedding: `[${embedding.join(",")}]` })
        .eq("id", article.id);

      processed++;
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch {
      errors++;
    }
  }

  return NextResponse.json({ processed, errors, total: (articles ?? []).length });
}

export { generateEmbedding };
