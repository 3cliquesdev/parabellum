import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";

// Lista artigos da base de conhecimento que ainda nao tem embedding gerado,
// pra um job externo (n8n, que tem credencial OpenAI) processar em lote.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  const limit = Math.min(Number(searchParams.get("limit") ?? "20") || 20, 100);
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.admin
    .from("knowledge_base")
    .select("id, titulo, conteudo")
    .eq("tenant_id", tenantId)
    .is("embedding", null)
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pending: data ?? [] });
}
