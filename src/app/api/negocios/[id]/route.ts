import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";
import { registrarEventoNegocio } from "@/lib/negocios/eventos";

interface UpdateNegocioBody {
  tenant_id?: string;
  titulo?: string;
  valor?: number | null;
  estagio?: "aberto" | "ganho" | "perdido";
  motivo_perda?: string | null;
  assigned_to?: string | null;
  pipeline_id?: string | null;
  pipeline_etapa_id?: string | null;
  origem_mudanca?: string;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: negocioId } = await params;
  const body = (await request.json().catch(() => ({}))) as UpdateNegocioBody;
  const { tenant_id } = body;
  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenant_id);
  if (!auth.ok) return auth.response;

  const { data: negocioAtual } = await auth.admin
    .from("negocios")
    .select("pipeline_etapa_id")
    .eq("id", negocioId)
    .eq("tenant_id", tenant_id)
    .maybeSingle();
  const etapaAnteriorId = (negocioAtual as { pipeline_etapa_id: string | null } | null)?.pipeline_etapa_id ?? null;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.titulo !== undefined) updates.titulo = body.titulo;
  if (body.valor !== undefined) updates.valor = body.valor;
  if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to;
  if (body.pipeline_id !== undefined) updates.pipeline_id = body.pipeline_id;

  let etapaTerminal: "ganho" | "perdido" | null = null;
  if (body.pipeline_etapa_id !== undefined) {
    updates.pipeline_etapa_id = body.pipeline_etapa_id;
    // Mover pra uma etapa marcada como ganho/perdido sincroniza o estagio
    // automaticamente - a etapa e' quem decide, nao precisa mandar os dois.
    if (body.pipeline_etapa_id) {
      const { data: etapa } = await auth.admin
        .from("pipeline_etapas")
        .select("e_ganho, e_perdido")
        .eq("id", body.pipeline_etapa_id)
        .maybeSingle();
      const etapaInfo = etapa as { e_ganho?: boolean; e_perdido?: boolean } | null;
      if (etapaInfo?.e_ganho) {
        updates.estagio = "ganho";
        updates.motivo_perda = null;
        updates.closed_at = new Date().toISOString();
        etapaTerminal = "ganho";
      } else if (etapaInfo?.e_perdido) {
        updates.estagio = "perdido";
        updates.motivo_perda = body.motivo_perda ?? null;
        updates.closed_at = new Date().toISOString();
        etapaTerminal = "perdido";
      } else {
        updates.estagio = "aberto";
        updates.motivo_perda = null;
        updates.closed_at = null;
      }
    }
  } else if (body.estagio !== undefined) {
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

  if (body.pipeline_etapa_id !== undefined && body.pipeline_etapa_id !== etapaAnteriorId) {
    await registrarEventoNegocio(auth.admin, {
      negocioId,
      tenantId: tenant_id,
      tipo: "mudanca_etapa",
      etapaAnteriorId,
      etapaNovaId: body.pipeline_etapa_id ?? null,
      usuarioId: auth.userId ?? null,
      origem: body.origem_mudanca ?? "manual",
    });
    if (etapaTerminal) {
      await registrarEventoNegocio(auth.admin, {
        negocioId,
        tenantId: tenant_id,
        tipo: etapaTerminal,
        etapaNovaId: body.pipeline_etapa_id ?? null,
        usuarioId: auth.userId ?? null,
        origem: body.origem_mudanca ?? "manual",
      });
    }
  }

  return NextResponse.json({ negocio: data });
}
