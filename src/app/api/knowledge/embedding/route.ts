import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";

interface SaveEmbeddingBody {
  tenant_id?: string;
  id?: string;
  embedding?: number[];
}

// Salva o embedding gerado externamente (n8n + OpenAI) para um artigo.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as SaveEmbeddingBody;
  const { tenant_id, id, embedding } = body;
  if (!tenant_id || !id || !Array.isArray(embedding) || embedding.length !== 768) {
    return NextResponse.json({ error: "tenant_id, id e embedding (768 dimensoes) sao obrigatorios" }, { status: 400 });
  }

  const auth = await resolveInternalOrTenantAuth(request, tenant_id);
  if (!auth.ok) return auth.response;

  const { error } = await auth.admin
    .from("knowledge_base")
    .update({ embedding: `[${embedding.join(",")}]` })
    .eq("id", id)
    .eq("tenant_id", tenant_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
