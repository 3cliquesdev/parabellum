import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";
import { escolherVendedorMenosCarregado } from "@/lib/negocios/distribuicao";

interface DistribuirBody {
  tenant_id?: string;
  pipeline_id?: string;
}

// Distribui todos os negocios sem responsavel desse pipeline, um a um,
// recalculando "quem tem menos carga" a cada atribuicao - assim o segundo
// negocio da fila ja considera o primeiro que acabou de ser distribuido.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as DistribuirBody;
  const { tenant_id, pipeline_id } = body;
  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  if (!pipeline_id) return NextResponse.json({ error: "pipeline_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenant_id);
  if (!auth.ok) return auth.response;

  const { data: pendentes } = await auth.admin
    .from("negocios")
    .select("id")
    .eq("tenant_id", tenant_id)
    .eq("pipeline_id", pipeline_id)
    .eq("estagio", "aberto")
    .is("assigned_to", null)
    .order("created_at", { ascending: true });

  const ids = ((pendentes ?? []) as { id: string }[]).map((n) => n.id);
  let distribuidos = 0;

  for (const id of ids) {
    const vendedor = await escolherVendedorMenosCarregado(auth.admin, pipeline_id);
    if (!vendedor) break; // sem equipe/ninguem disponivel - para de tentar
    await auth.admin.from("negocios").update({ assigned_to: vendedor, updated_at: new Date().toISOString() }).eq("id", id);
    distribuidos++;
  }

  return NextResponse.json({ success: true, distribuidos, pendentes: ids.length - distribuidos });
}
