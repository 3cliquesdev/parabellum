import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();

  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: sa } = await admin.from("super_admins").select("id").eq("email", user.email).single();
  if (!sa) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const yearMonth = new Date().toISOString().slice(0, 7);

  const [{ data: tenants }, { data: waConfigs }, { data: aiUsage }, { data: agencies }, { data: agencyTenants }] = await Promise.all([
    admin.from("admin_tenant_overview").select("*").order("created_at", { ascending: false }),
    admin.from("whatsapp_configs").select("tenant_id, phone_number_id, active, created_at"),
    admin.from("ai_usage").select("tenant_id, count, year_month").eq("year_month", yearMonth),
    admin.from("agencies").select("id, name, display_name, slug, plan, status, payment_status, max_tenants, created_at").order("created_at", { ascending: false }),
    admin.from("tenants").select("agency_id").not("agency_id", "is", null),
  ]);

  // Contar tenants por agência
  const tenantCountByAgency: Record<string, number> = {};
  (agencyTenants ?? []).forEach((t: any) => {
    tenantCountByAgency[t.agency_id] = (tenantCountByAgency[t.agency_id] ?? 0) + 1;
  });

  // MRR por agência (soma de client_price_brl dos tenants ativos da agência)
  const mrrByAgency: Record<string, number> = {};
  (tenants ?? []).forEach((t: any) => {
    if (t.agency_id && t.client_payment_status === "active") {
      mrrByAgency[t.agency_id] = (mrrByAgency[t.agency_id] ?? 0) + Number(t.client_price_brl ?? 0);
    }
  });

  const agenciesWithStats = (agencies ?? []).map((a: any) => ({
    ...a,
    tenant_count: tenantCountByAgency[a.id] ?? 0,
    mrr: mrrByAgency[a.id] ?? 0,
  }));

  const geminiActive = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const totalAiMessages = (aiUsage ?? []).reduce((s: number, r: any) => s + Number(r.count), 0);

  return NextResponse.json({
    tenants: tenants ?? [],
    waConfigs: waConfigs ?? [],
    aiUsage: aiUsage ?? [],
    agencies: agenciesWithStats,
    gemini: { active: geminiActive, totalMessages: totalAiMessages, yearMonth },
  });
}
