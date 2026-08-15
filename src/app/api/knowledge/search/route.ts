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

  const stopwords = new Set([
    "voces", "quais", "como", "para", "com", "que", "uma", "um", "sobre", "tem", "sao", "esta",
    "boa", "bom", "dia", "tarde", "noite", "ola", "oi", "vcs", "voce", "meu", "minha", "esse", "essa",
  ]);
  const keywords = q
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !stopwords.has(w));
  const terms = keywords.length > 0 ? keywords : [q];

  // \y = limite de palavra no Postgres - evita "boa" casar dentro de "boas" (bug real
  // que fazia uma saudacao generica trazer artigos completamente sem relacao).
  const orFilter = terms
    .flatMap((term) => [`titulo.imatch.\\y${term}\\y`, `conteudo.imatch.\\y${term}\\y`, `categoria.imatch.\\y${term}\\y`])
    .join(",");

  const { data, error } = await auth.admin
    .from("knowledge_base")
    .select("id, titulo, conteudo, categoria, tags, updated_at")
    .eq("tenant_id", tenantId)
    .eq("publicado", true)
    .or(orFilter)
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
