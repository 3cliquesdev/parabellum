import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";
import { buscarPedidoArmazem } from "@/lib/mabang";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  const numero = searchParams.get("numero");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  if (!numero) return NextResponse.json({ error: "numero required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;

  try {
    const pedido = await buscarPedidoArmazem(numero);
    if (!pedido) return NextResponse.json({ found: false });
    return NextResponse.json({ found: true, pedido });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "erro ao consultar armazem" }, { status: 502 });
  }
}
