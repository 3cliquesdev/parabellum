import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LooseDatabase } from "@/types/database";

interface AgencyUserRow {
  agency_id: string;
  role: string;
}

interface AgencyRow {
  id: string;
  plan: string | null;
  max_tenants: number | null;
  payment_status: string | null;
  trial_ends_at: string | null;
  display_name: string | null;
  name: string | null;
}

interface TenantRow {
  id: string;
  name: string;
  created_at: string;
}

interface TenantMemberRow {
  tenant_id: string;
}

interface AiUsageRow {
  tenant_id: string;
  count: number | null;
}

interface TenantLimitRow {
  tenant_id: string;
  messages_this_month: number | null;
  ai_calls_this_month: number | null;
  max_ai_calls_per_month: number | null;
}

interface AgencyPlanRow {
  id: string;
  display_name?: string | null;
  max_tenants?: number | null;
  max_ai_calls_per_month?: number | null;
}

interface RecentAuditRow {
  action: string;
  entity_type: string;
  details: Record<string, unknown> | null;
  created_at: string;
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

  const { data: agencyUser } = await admin
    .from("agency_users")
    .select("agency_id, role")
    .eq("user_id", user.id)
    .single();

  const currentAgencyUser = agencyUser as unknown as AgencyUserRow | null;
  if (!currentAgencyUser) {
    return NextResponse.json({ error: "Not an agency user" }, { status: 403 });
  }

  const agencyId = currentAgencyUser.agency_id;

  const { data: agency } = await admin
    .from("agencies")
    .select("id, plan, max_tenants, payment_status, trial_ends_at, display_name, name")
    .eq("id", agencyId)
    .single();

  const { data: tenants } = await admin
    .from("tenants")
    .select("id, name, created_at")
    .eq("agency_id", agencyId);

  const agencyData = agency as unknown as AgencyRow | null;
  const tenantRows = (tenants ?? []) as unknown as TenantRow[];
  const tenantIds = tenantRows.map((tenant) => tenant.id);

  const { data: members } = await admin
    .from("tenant_members")
    .select("tenant_id")
    .in("tenant_id", tenantIds);

  const memberMap: Record<string, number> = {};
  for (const member of ((members ?? []) as unknown as TenantMemberRow[])) {
    memberMap[member.tenant_id] = (memberMap[member.tenant_id] ?? 0) + 1;
  }

  const yearMonth = new Date().toISOString().slice(0, 7);
  const { data: aiUsage } = await admin
    .from("ai_usage")
    .select("tenant_id, count")
    .in("tenant_id", tenantIds)
    .eq("year_month", yearMonth);

  const aiMap: Record<string, number> = {};
  for (const usage of ((aiUsage ?? []) as unknown as AiUsageRow[])) {
    aiMap[usage.tenant_id] = usage.count ?? 0;
  }

  const { data: limits } = await admin
    .from("tenant_limits")
    .select("tenant_id, messages_this_month, ai_calls_this_month, max_ai_calls_per_month")
    .in("tenant_id", tenantIds);

  const limitsMap: Record<string, TenantLimitRow> = {};
  for (const limit of ((limits ?? []) as unknown as TenantLimitRow[])) {
    limitsMap[limit.tenant_id] = limit;
  }

  const tenantStats = tenantRows
    .map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      created_at: tenant.created_at,
      member_count: memberMap[tenant.id] ?? 0,
      ai_calls: aiMap[tenant.id] ?? 0,
      messages_this_month: limitsMap[tenant.id]?.messages_this_month ?? 0,
      max_ai_calls: limitsMap[tenant.id]?.max_ai_calls_per_month ?? 10000,
      usage_pct: Math.round(((aiMap[tenant.id] ?? 0) / (limitsMap[tenant.id]?.max_ai_calls_per_month ?? 10000)) * 100),
    }))
    .sort((left, right) => right.ai_calls - left.ai_calls);

  const totalMessages = tenantStats.reduce((sum, tenant) => sum + tenant.messages_this_month, 0);
  const totalAiCalls = tenantStats.reduce((sum, tenant) => sum + tenant.ai_calls, 0);
  const totalMembers = tenantStats.reduce((sum, tenant) => sum + tenant.member_count, 0);
  const nearLimit = tenantStats.filter((tenant) => tenant.usage_pct >= 80);

  const { data: planInfo } = await admin
    .from("agency_plans")
    .select("*")
    .eq("id", agencyData?.plan ?? "starter")
    .single();

  const { data: recentAudit } = await admin
    .from("agency_audit_logs")
    .select("action, entity_type, details, created_at")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    agency: { ...agencyData, display_name: agencyData?.display_name ?? agencyData?.name },
    plan: (planInfo as unknown as AgencyPlanRow | null) ?? null,
    totals: {
      tenants: tenantRows.length,
      max_tenants: agencyData?.max_tenants ?? 10,
      members: totalMembers,
      messages_this_month: totalMessages,
      ai_calls_this_month: totalAiCalls,
    },
    tenant_stats: tenantStats,
    near_limit: nearLimit,
    recent_audit: ((recentAudit ?? []) as unknown as RecentAuditRow[]),
  });
}
