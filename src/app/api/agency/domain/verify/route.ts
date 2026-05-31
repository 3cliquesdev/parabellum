import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const VERCEL_API = "https://api.vercel.com";

async function checkAllPending() {
  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: pending } = await admin
    .from("agencies")
    .select("id, custom_domain")
    .eq("domain_status", "verifying")
    .not("custom_domain", "is", null)
    .limit(50);

  if (!pending?.length) return { checked: 0, activated: 0 };

  let activated = 0;
  const token = process.env.VERCEL_TOKEN;
  const teamQuery = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : "";

  for (const agency of pending) {
    try {
      if (!token) continue;
      const res = await fetch(
        `${VERCEL_API}/v6/domains/${agency.custom_domain}/config${teamQuery}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data.misconfigured === false) {
        await admin.from("agencies").update({
          domain_status: "active",
          domain_verified_at: new Date().toISOString(),
        }).eq("id", agency.id);
        activated++;
      }
    } catch (err) {
      console.error(`DNS check error for ${agency.custom_domain}:`, err);
    }
  }

  return { checked: pending.length, activated };
}

// GET — Vercel Cron (a cada 5 min) OU verificação manual de domínio específico
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agencyId = searchParams.get("agency_id");

  // Verificação manual de domínio específico (chamada da UI)
  if (agencyId) {
    const admin = createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    const { data: agency } = await admin
      .from("agencies").select("id, custom_domain, domain_status")
      .eq("id", agencyId).single() as { data: any };

    if (!agency?.custom_domain) {
      return NextResponse.json({ domain_status: "pending", configured: false });
    }

    if (!process.env.VERCEL_TOKEN) {
      return NextResponse.json({ domain_status: agency.domain_status, configured: null });
    }

    const teamQuery = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : "";
    const res = await fetch(
      `${VERCEL_API}/v6/domains/${agency.custom_domain}/config${teamQuery}`,
      { headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` } }
    );

    if (!res.ok) return NextResponse.json({ domain_status: agency.domain_status, configured: false });
    const data = await res.json();
    const configured = data.misconfigured === false;

    if (configured && agency.domain_status !== "active") {
      await admin.from("agencies").update({
        domain_status: "active",
        domain_verified_at: new Date().toISOString(),
      }).eq("id", agencyId);
    }

    return NextResponse.json({
      domain: agency.custom_domain,
      domain_status: configured ? "active" : agency.domain_status,
      configured,
    });
  }

  // Cron: verifica todos os domínios pendentes
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await checkAllPending();
  return NextResponse.json(result);
}
