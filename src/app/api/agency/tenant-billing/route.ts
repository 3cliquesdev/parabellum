import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LooseDatabase } from "@/types/database";

interface AgencyUserRow {
  agency_id: string;
  role: string;
}

interface TenantRow {
  id: string;
  agency_id: string | null;
}

interface TenantBillingRow {
  tenant_id: string;
  agency_id: string;
  price_brl: number;
  billing_cycle: string;
  plan_name: string;
  payment_status: string;
  payment_link: string | null;
  next_billing_date: string | null;
  notes: string | null;
  updated_at: string;
  last_paid_at?: string | null;
}

interface TenantBillingBody {
  tenant_id?: string;
  price_brl?: number;
  billing_cycle?: string;
  plan_name?: string;
  payment_status?: string;
  payment_link?: string | null;
  next_billing_date?: string | null;
  notes?: string | null;
}

interface PaymentStatusBody {
  tenant_id?: string;
  payment_status?: string;
}

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

async function getAgencyMembership(userId: string): Promise<{ agencyId: string; role: string } | null> {
  const { data, error } = await createAdminClient()
    .from("agency_users")
    .select("agency_id, role")
    .eq("user_id", userId)
    .limit(1);

  const memberships = (data ?? []) as unknown as AgencyUserRow[];
  if (error || memberships.length === 0) return null;

  return {
    agencyId: memberships[0].agency_id,
    role: memberships[0].role,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const { data } = await createAdminClient()
    .from("tenant_billing")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();

  return NextResponse.json({ billing: (data as unknown as TenantBillingRow | null) ?? null });
}

export async function POST(request: NextRequest) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyMembership = await getAgencyMembership(user.id);
  if (!agencyMembership || !["owner", "admin"].includes(agencyMembership.role)) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as TenantBillingBody;
  if (!body.tenant_id) {
    return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  }

  const { data: tenant } = await createAdminClient()
    .from("tenants")
    .select("id, agency_id")
    .eq("id", body.tenant_id)
    .single();

  const tenantRow = tenant as unknown as TenantRow | null;
  if (!tenantRow || tenantRow.agency_id !== agencyMembership.agencyId) {
    return NextResponse.json({ error: "Tenant nao pertence a sua agencia" }, { status: 403 });
  }

  const payload: Record<string, unknown> = {
    tenant_id: body.tenant_id,
    agency_id: agencyMembership.agencyId,
    price_brl: body.price_brl ?? 0,
    billing_cycle: body.billing_cycle ?? "mensal",
    plan_name: body.plan_name ?? "Basico",
    payment_status: body.payment_status ?? "trial",
    payment_link: body.payment_link ?? null,
    next_billing_date: body.next_billing_date ?? null,
    notes: body.notes ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await createAdminClient()
    .from("tenant_billing")
    .upsert(payload, { onConflict: "tenant_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ billing: data as unknown as TenantBillingRow | null, success: true });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyMembership = await getAgencyMembership(user.id);
  if (!agencyMembership) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as PaymentStatusBody;
  if (!body.tenant_id || !body.payment_status) {
    return NextResponse.json({ error: "tenant_id and payment_status required" }, { status: 400 });
  }

  const updates: Partial<TenantBillingRow> = {
    payment_status: body.payment_status,
    updated_at: new Date().toISOString(),
  };

  if (body.payment_status === "active") {
    updates.last_paid_at = new Date().toISOString();
  }

  await createAdminClient()
    .from("tenant_billing")
    .update(updates)
    .eq("tenant_id", body.tenant_id)
    .eq("agency_id", agencyMembership.agencyId);

  return NextResponse.json({ success: true });
}
