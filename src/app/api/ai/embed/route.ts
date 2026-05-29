import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const VERTEX_PROJECT = "adsliberty";
const VERTEX_LOCATION = "us-central1";
const EMBED_MODEL = "text-embedding-004";

async function getVertexToken(): Promise<string> {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  const auth = new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = await auth.getClient();
  const t = await client.getAccessToken();
  return t.token!;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const token = await getVertexToken();
  const url = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT}/locations/${VERTEX_LOCATION}/publishers/google/models/${EMBED_MODEL}:predict`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ instances: [{ content: text, task_type: "SEMANTIC_SIMILARITY" }] }),
  });
  if (!res.ok) throw new Error(`Embedding failed: ${await res.text()}`);
  const data = await res.json();
  return data.predictions?.[0]?.embeddings?.values ?? [];
}

// POST /api/ai/embed — gera embedding de um texto ou artigo da KB
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, article_id } = await request.json();

  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  try {
    const embedding = await generateEmbedding(text);

    // Se article_id fornecido, salva o embedding no banco
    if (article_id) {
      const admin = createServerClient<any>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll: () => [], setAll: () => {} } }
      );
      await admin.from("knowledge_base").update({ embedding: `[${embedding.join(",")}]` }).eq("id", article_id);
    }

    return NextResponse.json({ embedding, dimensions: embedding.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/ai/embed?batch=true&tenant_id=xxx — gera embeddings para todos os artigos sem embedding
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: articles } = await admin
    .from("knowledge_base")
    .select("id, titulo, conteudo")
    .eq("tenant_id", tenantId)
    .is("embedding", null);

  let processed = 0, errors = 0;
  for (const article of articles ?? []) {
    try {
      const text = `${article.titulo}\n\n${article.conteudo}`;
      const embedding = await generateEmbedding(text);
      await admin.from("knowledge_base").update({ embedding: `[${embedding.join(",")}]` }).eq("id", article.id);
      processed++;
      await new Promise(r => setTimeout(r, 200)); // Rate limit
    } catch {
      errors++;
    }
  }

  return NextResponse.json({ processed, errors, total: (articles ?? []).length });
}

// Exportar a função para uso interno no webhook
export { generateEmbedding };
