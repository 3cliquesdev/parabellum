import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LooseDatabase } from "@/types/database";

interface AgencyUserRow {
  agency_id: string;
  role: "owner" | "admin" | "staff";
}

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  agency_id: string;
}

interface TenantMemberRow {
  tenant_id: string;
}

interface TenantBillingRow {
  tenant_id: string;
  price_brl: number | null;
  billing_cycle: string | null;
  plan_name: string | null;
  payment_status: string | null;
  next_billing_date: string | null;
}

interface AgencyLimitsRow {
  max_tenants: number | null;
}

function adminClient() {
  return createServerClient<LooseDatabase>(
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

  return data as unknown as AgencyUserRow | null;
}

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient<LooseDatabase>(
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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tenantRows = (tenants ?? []) as unknown as TenantRow[];
  const tenantIds = tenantRows.map((tenant) => tenant.id);

  const { data: memberCounts } = await admin
    .from("tenant_members")
    .select("tenant_id")
    .in("tenant_id", tenantIds);

  const countMap: Record<string, number> = {};
  for (const member of ((memberCounts ?? []) as unknown as TenantMemberRow[])) {
    countMap[member.tenant_id] = (countMap[member.tenant_id] ?? 0) + 1;
  }

  const { data: billingData } = await admin
    .from("tenant_billing")
    .select("tenant_id, price_brl, billing_cycle, plan_name, payment_status, next_billing_date")
    .in("tenant_id", tenantIds);

  const billingMap: Record<string, TenantBillingRow> = {};
  for (const billing of ((billingData ?? []) as unknown as TenantBillingRow[])) {
    billingMap[billing.tenant_id] = billing;
  }

  return NextResponse.json({
    customers: tenantRows.map((tenant) => ({
      ...tenant,
      member_count: countMap[tenant.id] ?? 0,
      billing: billingMap[tenant.id] ?? null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<LooseDatabase>(
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

  const body = (await request.json()) as { name?: string; email?: string };
  const { name, email } = body;
  if (!name || !email) {
    return NextResponse.json({ error: "name e email são obrigatórios" }, { status: 400 });
  }

  const admin = adminClient();

  const { data: agency } = await admin
    .from("agencies")
    .select("max_tenants")
    .eq("id", agencyUser.agency_id)
    .single();

  const { count } = await admin
    .from("tenants")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", agencyUser.agency_id);

  const agencyLimits = agency as unknown as AgencyLimitsRow | null;
  if ((count ?? 0) >= (agencyLimits?.max_tenants ?? 10)) {
    return NextResponse.json({ error: "Limite de clientes atingido para seu plano" }, { status: 400 });
  }

  const baseSlug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 30);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  const { data: tenant, error: tenantErr } = await admin
    .from("tenants")
    .insert({ name, slug, agency_id: agencyUser.agency_id })
    .select("id, name, slug")
    .single();

  if (tenantErr) {
    return NextResponse.json({ error: tenantErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, tenant });
}
