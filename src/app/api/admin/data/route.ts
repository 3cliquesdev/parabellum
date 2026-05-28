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

  const [{ data: tenants }, { data: waConfigs }, { data: aiUsage }] = await Promise.all([
    admin.from("admin_tenant_overview").select("*").order("created_at", { ascending: false }),
    admin.from("whatsapp_configs").select("tenant_id, phone_number_id, active, created_at"),
    admin.from("ai_usage").select("tenant_id, count, year_month").eq("year_month", yearMonth),
  ]);

  const geminiActive = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const totalAiMessages = (aiUsage ?? []).reduce((s: number, r: any) => s + Number(r.count), 0);

  return NextResponse.json({
    tenants: tenants ?? [],
    waConfigs: waConfigs ?? [],
    aiUsage: aiUsage ?? [],
    gemini: { active: geminiActive, totalMessages: totalAiMessages, yearMonth },
  });
}
