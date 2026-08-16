import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";

interface UpdateNegocioBody {
  tenant_id?: string;
  titulo?: string;
  valor?: number | null;
  estagio?: "aberto" | "ganho" | "perdido";
  motivo_perda?: string | null;
  assigned_to?: string | null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: negocioId } = await params;
  const body = (await request.json().catch(() => ({}))) as UpdateNegocioBody;
  const { tenant_id } = body;
  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenant_id);
  if (!auth.ok) return auth.response;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.titulo !== undefined) updates.titulo = body.titulo;
  if (body.valor !== undefined) updates.valor = body.valor;
  if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to;
  if (body.estagio !== undefined) {
    updates.estagio = body.estagio;
    updates.motivo_perda = body.estagio === "perdido" ? (body.motivo_perda ?? null) : null;
    if (body.estagio !== "aberto") updates.closed_at = new Date().toISOString();
  }

  const { data, error } = await auth.admin
    .from("negocios")
    .update(updates)
    .eq("id", negocioId)
    .eq("tenant_id", tenant_id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "negocio nao encontrado" }, { status: 404 });
  return NextResponse.json({ negocio: data });
}
