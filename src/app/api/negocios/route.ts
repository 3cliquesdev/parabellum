import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";

interface CreateNegocioBody {
  tenant_id?: string;
  lead_id?: string;
  titulo?: string;
  valor?: number | null;
  estagio?: "aberto" | "ganho" | "perdido";
  origem?: string;
  assigned_to?: string | null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;

  const leadId = searchParams.get("lead_id");

  let query = auth.admin
    .from("negocios")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (leadId) query = query.eq("lead_id", leadId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ negocios: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as CreateNegocioBody;
  const { tenant_id, lead_id, titulo } = body;
  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  if (!lead_id) return NextResponse.json({ error: "lead_id required" }, { status: 400 });
  if (!titulo) return NextResponse.json({ error: "titulo required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenant_id);
  if (!auth.ok) return auth.response;

  const { data: lead } = await auth.admin
    .from("leads")
    .select("id")
    .eq("id", lead_id)
    .eq("tenant_id", tenant_id)
    .maybeSingle();
  if (!lead) return NextResponse.json({ error: "lead nao encontrado" }, { status: 404 });

  const { data, error } = await auth.admin
    .from("negocios")
    .insert({
      tenant_id,
      lead_id,
      titulo,
      valor: body.valor ?? null,
      estagio: body.estagio ?? "aberto",
      origem: body.origem ?? "manual",
      assigned_to: body.assigned_to ?? null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ negocio: data });
}
