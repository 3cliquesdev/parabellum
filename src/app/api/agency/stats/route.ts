import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
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

  // Buscar agência do usuário
  const { data: agencyUser } = await admin
    .from("agency_users").select("agency_id, role")
    .eq("user_id", user.id).single() as { data: any };

  if (!agencyUser) return NextResponse.json({ error: "Not an agency user" }, { status: 403 });

  const agencyId = agencyUser.agency_id;

  // Buscar agência com plano
  const { data: agency } = await admin
    .from("agencies")
    .select("id, plan, max_tenants, payment_status, trial_ends_at, display_name, name")
    .eq("id", agencyId).single() as { data: any };

  // Buscar todos os tenants da agência
  const { data: tenants } = await admin
    .from("tenants").select("id, name, created_at")
    .eq("agency_id", agencyId) as { data: any[] };

  const tenantIds = (tenants ?? []).map(t => t.id);

  // Contagem de membros por tenant
  const { data: members } = await admin
    .from("tenant_members").select("tenant_id")
    .in("tenant_id", tenantIds) as { data: any[] };

  const memberMap: Record<string, number> = {};
  (members ?? []).forEach((m: any) => {
    memberMap[m.tenant_id] = (memberMap[m.tenant_id] ?? 0) + 1;
  });

  // Uso de mensagens (mês atual)
  const yearMonth = new Date().toISOString().slice(0, 7);
  const { data: aiUsage } = await admin
    .from("ai_usage").select("tenant_id, count")
    .in("tenant_id", tenantIds)
    .eq("year_month", yearMonth) as { data: any[] };

  const aiMap: Record<string, number> = {};
  (aiUsage ?? []).forEach((u: any) => { aiMap[u.tenant_id] = u.count ?? 0; });

  // Limites por tenant
  const { data: limits } = await admin
    .from("tenant_limits").select("tenant_id, messages_this_month, ai_calls_this_month, max_ai_calls_per_month")
    .in("tenant_id", tenantIds) as { data: any[] };

  const limitsMap: Record<string, any> = {};
  (limits ?? []).forEach((l: any) => { limitsMap[l.tenant_id] = l; });

  // Montar stats por tenant
  const tenantStats = (tenants ?? []).map(t => ({
    id: t.id,
    name: t.name,
    created_at: t.created_at,
    member_count: memberMap[t.id] ?? 0,
    ai_calls: aiMap[t.id] ?? 0,
    messages_this_month: limitsMap[t.id]?.messages_this_month ?? 0,
    max_ai_calls: limitsMap[t.id]?.max_ai_calls_per_month ?? 10000,
    usage_pct: Math.round(((aiMap[t.id] ?? 0) / (limitsMap[t.id]?.max_ai_calls_per_month ?? 10000)) * 100),
  })).sort((a, b) => b.ai_calls - a.ai_calls);

  // Totais
  const totalMessages = tenantStats.reduce((s, t) => s + t.messages_this_month, 0);
  const totalAiCalls = tenantStats.reduce((s, t) => s + t.ai_calls, 0);
  const totalMembers = tenantStats.reduce((s, t) => s + t.member_count, 0);
  const nearLimit = tenantStats.filter(t => t.usage_pct >= 80);

  // Plano info
  const { data: planInfo } = await admin
    .from("agency_plans").select("*").eq("id", agency?.plan ?? "starter").single() as { data: any };

  // Audit logs recentes
  const { data: recentAudit } = await admin
    .from("agency_audit_logs").select("action, entity_type, details, created_at")
    .eq("agency_id", agencyId).order("created_at", { ascending: false }).limit(10) as { data: any[] };

  return NextResponse.json({
    agency: { ...agency, display_name: agency?.display_name ?? agency?.name },
    plan: planInfo,
    totals: {
      tenants: tenants?.length ?? 0,
      max_tenants: agency?.max_tenants ?? 10,
      members: totalMembers,
      messages_this_month: totalMessages,
      ai_calls_this_month: totalAiCalls,
    },
    tenant_stats: tenantStats,
    near_limit: nearLimit,
    recent_audit: recentAudit ?? [],
  });
}
