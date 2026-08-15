import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";

interface SearchVectorBody {
  tenant_id?: string;
  embedding?: number[];
  match_count?: number;
  threshold?: number;
}

interface KnowledgeMatch {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: string;
  updated_at: string;
  similarity: number;
}

// Busca semantica real na base de conhecimento (RAG), usada pelo agente de
// IA no lugar da busca por palavra-chave. O agente ja embeddou a pergunta
// do cliente (via OpenAI, no n8n) e manda o vetor pronto aqui.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as SearchVectorBody;
  const { tenant_id, embedding } = body;
  if (!tenant_id || !Array.isArray(embedding) || embedding.length !== 768) {
    return NextResponse.json({ error: "tenant_id e embedding (768 dimensoes) sao obrigatorios" }, { status: 400 });
  }

  const auth = await resolveInternalOrTenantAuth(request, tenant_id);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.admin.rpc("buscar_conhecimento", {
    p_tenant_id: tenant_id,
    query_embedding: `[${embedding.join(",")}]`,
    match_count: body.match_count ?? 3,
    threshold: body.threshold ?? 0.55,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as KnowledgeMatch[];
  return NextResponse.json({
    found: rows.length > 0,
    results: rows.map((r) => ({
      titulo: r.titulo,
      conteudo: r.conteudo,
      categoria: r.categoria,
      similaridade: Number(r.similarity.toFixed(3)),
      _grounding: { source: "knowledge_base", ref_id: r.id, fetched_at: new Date().toISOString(), updated_at: r.updated_at },
    })),
  });
}
