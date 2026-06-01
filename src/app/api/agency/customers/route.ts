import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function adminClient() {
  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

async function getAgencyUser(userId: string) {
  const admin = adminClient();
  const { data } = await admin
    .from("agency_users")
    .select("agency_id, role")
    .eq("user_id", userId)
    .in("role", ["owner", "admin", "staff"])
    .single();
  return data;
}

// GET — listar clientes da agência
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyUser = await getAgencyUser(user.id);
  if (!agencyUser) return NextResponse.json({ error: "Not an agency user" }, { status: 403 });

  const admin = adminClient();
  const { data: tenants, error } = await admin
    .from("tenants")
    .select("id, name, slug, created_at, agency_id")
    .eq("agency_id", agencyUser.agency_id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Contar membros por tenant
  const tenantIds = (tenants ?? []).map((t: any) => t.id);
  const { data: memberCounts } = await admin
    .from("tenant_members")
    .select("tenant_id")
    .in("tenant_id", tenantIds);

  const countMap: Record<string, number> = {};
  (memberCounts ?? []).forEach((m: any) => {
    countMap[m.tenant_id] = (countMap[m.tenant_id] ?? 0) + 1;
  });

  // Buscar billing de todos os tenants
  const { data: billingData } = await admin
    .from("tenant_billing")
    .select("tenant_id, price_brl, billing_cycle, plan_name, payment_status, next_billing_date")
    .in("tenant_id", tenantIds);

  const billingMap: Record<string, any> = {};
  (billingData ?? []).forEach((b: any) => { billingMap[b.tenant_id] = b; });

  return NextResponse.json({
    customers: (tenants ?? []).map((t: any) => ({
      ...t,
      member_count: countMap[t.id] ?? 0,
      billing: billingMap[t.id] ?? null,
    })),
  });
}

// POST — criar novo cliente (tenant) para a agência
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyUser = await getAgencyUser(user.id);
  if (!agencyUser || !["owner", "admin"].includes(agencyUser.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { name, email } = await request.json();
  if (!name || !email) return NextResponse.json({ error: "name e email são obrigatórios" }, { status: 400 });

  const admin = adminClient();

  // Verificar limite de tenants
  const { data: agency } = await admin.from("agencies").select("max_tenants").eq("id", agencyUser.agency_id).single() as { data: any };
  const { count } = await admin.from("tenants").select("id", { count: "exact", head: true }).eq("agency_id", agencyUser.agency_id) as any;
  if ((count ?? 0) >= (agency?.max_tenants ?? 10)) {
    return NextResponse.json({ error: "Limite de clientes atingido para seu plano" }, { status: 400 });
  }

  // Gerar slug único
  const baseSlug = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 30);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  // Criar tenant
  const { data: tenant, error: tenantErr } = await admin.from("tenants").insert({
    name, slug, agency_id: agencyUser.agency_id,
  }).select("id, name, slug").single() as { data: any; error: any };

  if (tenantErr) return NextResponse.json({ error: tenantErr.message }, { status: 500 });

  // Criar usuário convidado (se email fornecido)
  // Por ora apenas cria o tenant — convite será feito pelo painel de equipe
  return NextResponse.json({ success: true, tenant });
}
