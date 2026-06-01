import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function admin() {
  return createServerClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { cookies: { getAll: () => [], setAll: () => {} } });
}

async function getAgencyId(userId: string) {
  // Usar limit(1) em vez de single() para evitar erro se múltiplos registros
  const { data, error } = await admin()
    .from("agency_users")
    .select("agency_id, role")
    .eq("user_id", userId)
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return data[0];
}

// GET — listar planos da agência
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agencyId = searchParams.get("agency_id");
  const activeOnly = searchParams.get("active") !== "false";

  if (!agencyId) return NextResponse.json({ error: "agency_id required" }, { status: 400 });

  let q = admin().from("agency_client_plans").select("*").eq("agency_id", agencyId).order("price_brl", { ascending: true });
  if (activeOnly) q = q.eq("ativo", true);

  const { data } = await q;
  return NextResponse.json({ plans: data ?? [] });
}

// POST — criar plano
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyData = await getAgencyId(user.id);
  if (!agencyData || !["owner", "admin"].includes(agencyData.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { nome, descricao, price_brl, billing_cycle, features } = await request.json();
  if (!nome || price_brl === undefined) return NextResponse.json({ error: "nome e price_brl são obrigatórios" }, { status: 400 });

  const { data, error } = await admin().from("agency_client_plans").insert({
    agency_id: agencyData.agency_id, nome, descricao: descricao || null,
    price_brl: parseFloat(price_brl) || 0,
    billing_cycle: billing_cycle || "mensal",
    features: features || [],
    ativo: true,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plan: data });
}

// PATCH — editar plano
export async function PATCH(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyData = await getAgencyId(user.id);
  if (!agencyData) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { plan_id, ...updates } = await request.json();
  if (!plan_id) return NextResponse.json({ error: "plan_id required" }, { status: 400 });

  if (updates.price_brl !== undefined) updates.price_brl = parseFloat(updates.price_brl) || 0;

  await admin().from("agency_client_plans").update(updates).eq("id", plan_id).eq("agency_id", agencyData.agency_id);
  return NextResponse.json({ success: true });
}

// DELETE — desativar plano
export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyData = await getAgencyId(user.id);
  if (!agencyData) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { plan_id } = await request.json();
  await admin().from("agency_client_plans").update({ ativo: false }).eq("id", plan_id).eq("agency_id", agencyData.agency_id);
  return NextResponse.json({ success: true });
}

// PUT — criar planos padrão (seed)
export async function PUT(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyData = await getAgencyId(user.id);
  if (!agencyData) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  // Verificar se já tem planos
  const { data: existing } = await admin().from("agency_client_plans").select("id").eq("agency_id", agencyData.agency_id).limit(1);
  if ((existing ?? []).length > 0) return NextResponse.json({ error: "Agência já possui planos" }, { status: 409 });

  const DEFAULT_PLANS = [
    {
      nome: "Básico",
      descricao: "Para quem está começando",
      price_brl: 297,
      billing_cycle: "mensal",
      features: ["Pipeline de vendas", "WhatsApp com IA", "Suporte por chat"],
    },
    {
      nome: "Pro",
      descricao: "O mais popular entre nossos clientes",
      price_brl: 497,
      billing_cycle: "mensal",
      features: ["Pipeline de vendas", "WhatsApp com IA", "Agentes de IA", "Broadcast em massa", "Suporte prioritário"],
    },
    {
      nome: "Premium",
      descricao: "Para operações completas",
      price_brl: 797,
      billing_cycle: "mensal",
      features: ["Pipeline de vendas", "WhatsApp com IA", "Agentes de IA", "Broadcast", "Chat Flows", "Base de conhecimento", "Suporte dedicado"],
    },
  ];

  const toInsert = DEFAULT_PLANS.map(p => ({ ...p, agency_id: agencyData.agency_id, ativo: true }));
  const { data, error } = await admin().from("agency_client_plans").insert(toInsert).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plans: data, created: true });
}
