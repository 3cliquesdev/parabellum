import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function admin() {
  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

async function getAgencyId(userId: string): Promise<{ agencyId: string; role: string } | null> {
  const { data } = await admin().from("agency_users").select("agency_id, role").eq("user_id", userId).single();
  return data ? { agencyId: data.agency_id, role: data.role } : null;
}

// GET — buscar billing de um tenant específico
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const { data } = await admin().from("tenant_billing").select("*").eq("tenant_id", tenantId).single();
  return NextResponse.json({ billing: data ?? null });
}

// POST — criar ou atualizar billing de um tenant
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyData = await getAgencyId(user.id);
  if (!agencyData || !["owner", "admin"].includes(agencyData.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json();
  const { tenant_id, price_brl, billing_cycle, plan_name, payment_status, payment_link, next_billing_date, notes } = body;
  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  // Verificar que o tenant pertence à agência
  const { data: tenant } = await admin().from("tenants").select("id, agency_id").eq("id", tenant_id).single() as { data: any };
  if (!tenant || tenant.agency_id !== agencyData.agencyId) {
    return NextResponse.json({ error: "Tenant não pertence à sua agência" }, { status: 403 });
  }

  const payload = {
    tenant_id,
    agency_id: agencyData.agencyId,
    price_brl: price_brl ?? 0,
    billing_cycle: billing_cycle ?? "mensal",
    plan_name: plan_name ?? "Básico",
    payment_status: payment_status ?? "trial",
    payment_link: payment_link ?? null,
    next_billing_date: next_billing_date ?? null,
    notes: notes ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin().from("tenant_billing")
    .upsert(payload, { onConflict: "tenant_id" })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ billing: data, success: true });
}

// PATCH — atualizar só o status de pagamento
export async function PATCH(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyData = await getAgencyId(user.id);
  if (!agencyData) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { tenant_id, payment_status } = await request.json();
  const updates: any = { payment_status, updated_at: new Date().toISOString() };
  if (payment_status === "active") updates.last_paid_at = new Date().toISOString();

  await admin().from("tenant_billing").update(updates).eq("tenant_id", tenant_id).eq("agency_id", agencyData.agencyId);
  return NextResponse.json({ success: true });
}
