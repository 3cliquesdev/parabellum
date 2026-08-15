import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";

interface KnowledgeRow {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: string;
  tags: string[];
  updated_at: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  const q = searchParams.get("q")?.trim();
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  if (!q) return NextResponse.json({ found: false, results: [] });

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.admin
    .from("knowledge_base")
    .select("id, titulo, conteudo, categoria, tags, updated_at")
    .eq("tenant_id", tenantId)
    .eq("publicado", true)
    .or(`titulo.ilike.%${q}%,conteudo.ilike.%${q}%,categoria.ilike.%${q}%`)
    .limit(5);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as unknown as KnowledgeRow[];
  return NextResponse.json({
    found: rows.length > 0,
    results: rows.map((r) => ({
      titulo: r.titulo,
      conteudo: r.conteudo,
      categoria: r.categoria,
      _grounding: { source: "knowledge_base", ref_id: r.id, fetched_at: new Date().toISOString(), updated_at: r.updated_at },
    })),
  });
}
