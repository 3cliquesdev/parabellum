import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LooseDatabase } from "@/types/database";

interface AgencyUserRow {
  agency_id: string;
  role: string;
}

interface AgencyRow {
  id: string;
}

interface SuperAdminRow {
  user_id: string;
}

interface AgencyClientPlanRow {
  id: string;
  agency_id: string;
  nome: string;
  descricao: string | null;
  price_brl: number;
  billing_cycle: string;
  features: string[];
  ativo: boolean;
}

interface CreatePlanBody {
  nome?: string;
  descricao?: string | null;
  price_brl?: number | string;
  billing_cycle?: string;
  features?: string[];
}

interface UpdatePlanBody extends CreatePlanBody {
  plan_id?: string;
  ativo?: boolean;
}

interface SeedPlansBody {
  agency_id?: string;
}

const DEFAULT_PLANS: Array<Omit<AgencyClientPlanRow, "id" | "agency_id" | "ativo">> = [
  {
    nome: "Basico",
    descricao: "Para quem esta comecando",
    price_brl: 297,
    billing_cycle: "mensal",
    features: ["Pipeline de vendas", "WhatsApp com IA", "Suporte por chat"],
  },
  {
    nome: "Pro",
    descricao: "O mais popular entre nossos clientes",
    price_brl: 497,
    billing_cycle: "mensal",
    features: ["Pipeline de vendas", "WhatsApp com IA", "Agentes de IA", "Broadcast em massa", "Suporte prioritario"],
  },
  {
    nome: "Premium",
    descricao: "Para operacoes completas",
    price_brl: 797,
    billing_cycle: "mensal",
    features: ["Pipeline de vendas", "WhatsApp com IA", "Agentes de IA", "Broadcast", "Chat Flows", "Base de conhecimento", "Suporte dedicado"],
  },
];

function createAdminClient() {
  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

function parsePrice(value: number | string | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

async function getAgencyMembership(userId: string): Promise<AgencyUserRow | null> {
  const { data, error } = await createAdminClient()
    .from("agency_users")
    .select("agency_id, role")
    .eq("user_id", userId)
    .limit(1);

  const memberships = (data ?? []) as unknown as AgencyUserRow[];
  if (error || memberships.length === 0) return null;

  return memberships[0];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agencyId = searchParams.get("agency_id");
  const activeOnly = searchParams.get("active") !== "false";

  if (!agencyId) {
    return NextResponse.json({ error: "agency_id required" }, { status: 400 });
  }

  let query = createAdminClient()
    .from("agency_client_plans")
    .select("*")
    .eq("agency_id", agencyId)
    .order("price_brl", { ascending: true });

  if (activeOnly) query = query.eq("ativo", true);

  const { data } = await query;
  return NextResponse.json({ plans: (data ?? []) as unknown as AgencyClientPlanRow[] });
}

export async function POST(request: NextRequest) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyMembership = await getAgencyMembership(user.id);
  if (!agencyMembership || !["owner", "admin"].includes(agencyMembership.role)) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as CreatePlanBody;
  if (!body.nome || body.price_brl === undefined) {
    return NextResponse.json({ error: "nome e price_brl sao obrigatorios" }, { status: 400 });
  }

  const payload: Omit<AgencyClientPlanRow, "id"> = {
    agency_id: agencyMembership.agency_id,
    nome: body.nome,
    descricao: body.descricao?.trim() ? body.descricao : null,
    price_brl: parsePrice(body.price_brl),
    billing_cycle: body.billing_cycle ?? "mensal",
    features: body.features ?? [],
    ativo: true,
  };

  const { data, error } = await createAdminClient()
    .from("agency_client_plans")
    .insert(payload)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plan: data as unknown as AgencyClientPlanRow | null });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyMembership = await getAgencyMembership(user.id);
  if (!agencyMembership) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as UpdatePlanBody;
  if (!body.plan_id) {
    return NextResponse.json({ error: "plan_id required" }, { status: 400 });
  }

  const updates: Partial<AgencyClientPlanRow> = {};
  if (body.nome !== undefined) updates.nome = body.nome;
  if (body.descricao !== undefined) updates.descricao = body.descricao?.trim() ? body.descricao : null;
  if (body.price_brl !== undefined) updates.price_brl = parsePrice(body.price_brl);
  if (body.billing_cycle !== undefined) updates.billing_cycle = body.billing_cycle;
  if (body.features !== undefined) updates.features = body.features;
  if (body.ativo !== undefined) updates.ativo = body.ativo;

  await createAdminClient()
    .from("agency_client_plans")
    .update(updates)
    .eq("id", body.plan_id)
    .eq("agency_id", agencyMembership.agency_id);

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyMembership = await getAgencyMembership(user.id);
  if (!agencyMembership) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Pick<UpdatePlanBody, "plan_id">;
  if (!body.plan_id) {
    return NextResponse.json({ error: "plan_id required" }, { status: 400 });
  }

  await createAdminClient()
    .from("agency_client_plans")
    .update({ ativo: false })
    .eq("id", body.plan_id)
    .eq("agency_id", agencyMembership.agency_id);

  return NextResponse.json({ success: true });
}

export async function PUT(request: NextRequest) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as SeedPlansBody;
  let resolvedAgencyId = body.agency_id ?? null;

  if (!resolvedAgencyId) {
    const { data: memberships } = await createAdminClient()
      .from("agency_users")
      .select("agency_id")
      .eq("user_id", user.id)
      .limit(1);

    const agencyRows = (memberships ?? []) as unknown as Pick<AgencyUserRow, "agency_id">[];
    if (agencyRows.length > 0) resolvedAgencyId = agencyRows[0].agency_id;
  }

  if (!resolvedAgencyId && user.email) {
    const { data: superAdmins } = await createAdminClient()
      .from("super_admins")
      .select("user_id")
      .eq("email", user.email)
      .limit(1);

    const superAdminRows = (superAdmins ?? []) as unknown as SuperAdminRow[];
    if (superAdminRows.length > 0) {
      const { data: agencies } = await createAdminClient()
        .from("agencies")
        .select("id")
        .limit(1);

      const agencyRows = (agencies ?? []) as unknown as AgencyRow[];
      if (agencyRows.length > 0) resolvedAgencyId = agencyRows[0].id;
    }
  }

  if (!resolvedAgencyId) {
    return NextResponse.json({ error: "Sem permissao - nenhuma agencia encontrada" }, { status: 403 });
  }

  const { data: existing } = await createAdminClient()
    .from("agency_client_plans")
    .select("id")
    .eq("agency_id", resolvedAgencyId)
    .limit(1);

  if ((existing ?? []).length > 0) {
    return NextResponse.json({ error: "Agencia ja possui planos" }, { status: 409 });
  }

  const toInsert = DEFAULT_PLANS.map((plan) => ({
    ...plan,
    agency_id: resolvedAgencyId,
    ativo: true,
  }));

  const { data, error } = await createAdminClient()
    .from("agency_client_plans")
    .insert(toInsert)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plans: (data ?? []) as unknown as AgencyClientPlanRow[], created: true });
}
