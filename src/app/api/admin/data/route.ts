import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { LooseDatabase } from "@/types/database";

interface AgencyTenantRow {
  agency_id: string | null;
}

interface TenantOverviewRow {
  agency_id?: string | null;
  client_payment_status?: string | null;
  client_price_brl?: number | null;
}

interface AgencyRow {
  id: string;
  name: string;
  display_name?: string | null;
  slug?: string | null;
  plan?: string | null;
  status?: string | null;
  payment_status?: string | null;
  max_tenants?: number | null;
  created_at?: string;
}

interface AiUsageRow {
  count: number | null;
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

  const admin = createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: sa } = await admin
    .from("super_admins")
    .select("id")
    .eq("email", user.email ?? "")
    .single();
  if (!sa) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const yearMonth = new Date().toISOString().slice(0, 7);

  const [
    { data: tenants },
    { data: waConfigs },
    { data: aiUsage },
    { data: agencies },
    { data: agencyTenants },
  ] = await Promise.all([
    admin.from("admin_tenant_overview").select("*").order("created_at", { ascending: false }),
    admin.from("whatsapp_configs").select("tenant_id, phone_number_id, active, created_at"),
    admin.from("ai_usage").select("tenant_id, count, year_month").eq("year_month", yearMonth),
    admin.from("agencies").select("id, name, display_name, slug, plan, status, payment_status, max_tenants, created_at").order("created_at", { ascending: false }),
    admin.from("tenants").select("agency_id").not("agency_id", "is", null),
  ]);

  const tenantCountByAgency: Record<string, number> = {};
  for (const tenant of ((agencyTenants ?? []) as unknown as AgencyTenantRow[])) {
    if (!tenant.agency_id) continue;
    tenantCountByAgency[tenant.agency_id] = (tenantCountByAgency[tenant.agency_id] ?? 0) + 1;
  }

  const mrrByAgency: Record<string, number> = {};
  for (const tenant of ((tenants ?? []) as unknown as TenantOverviewRow[])) {
    if (tenant.agency_id && tenant.client_payment_status === "active") {
      mrrByAgency[tenant.agency_id] = (mrrByAgency[tenant.agency_id] ?? 0) + Number(tenant.client_price_brl ?? 0);
    }
  }

  const agenciesWithStats = ((agencies ?? []) as unknown as AgencyRow[]).map((agency) => ({
    ...agency,
    tenant_count: tenantCountByAgency[agency.id] ?? 0,
    mrr: mrrByAgency[agency.id] ?? 0,
  }));

  const geminiActive = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const totalAiMessages = ((aiUsage ?? []) as unknown as AiUsageRow[]).reduce(
    (sum, row) => sum + Number(row.count ?? 0),
    0
  );

  return NextResponse.json({
    tenants: tenants ?? [],
    waConfigs: waConfigs ?? [],
    aiUsage: aiUsage ?? [],
    agencies: agenciesWithStats,
    gemini: { active: geminiActive, totalMessages: totalAiMessages, yearMonth },
  });
}
