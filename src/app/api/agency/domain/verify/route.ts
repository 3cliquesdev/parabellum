import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { LooseDatabase } from "@/types/database";

const VERCEL_API = "https://api.vercel.com";

interface PendingAgencyRow {
  id: string;
  custom_domain: string | null;
}

interface AgencyDomainRow extends PendingAgencyRow {
  domain_status: string | null;
}

interface VercelDomainConfigResponse {
  misconfigured?: boolean;
}

function createAdminClient() {
  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

async function checkAllPending() {
  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("agencies")
    .select("id, custom_domain")
    .eq("domain_status", "verifying")
    .not("custom_domain", "is", null)
    .limit(50);

  const pendingAgencies = (pending ?? []) as unknown as PendingAgencyRow[];
  if (pendingAgencies.length === 0) return { checked: 0, activated: 0 };

  let activated = 0;
  const token = process.env.VERCEL_TOKEN;
  const teamQuery = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : "";

  for (const agency of pendingAgencies) {
    try {
      if (!token || !agency.custom_domain) continue;

      const response = await fetch(`${VERCEL_API}/v6/domains/${agency.custom_domain}/config${teamQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) continue;

      const data = (await response.json()) as VercelDomainConfigResponse;
      if (data.misconfigured === false) {
        await admin.from("agencies").update({
          domain_status: "active",
          domain_verified_at: new Date().toISOString(),
        }).eq("id", agency.id);
        activated++;
      }
    } catch (error) {
      console.error(`DNS check error for ${agency.custom_domain}:`, error);
    }
  }

  return { checked: pendingAgencies.length, activated };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agencyId = searchParams.get("agency_id");

  if (agencyId) {
    const admin = createAdminClient();
    const { data: agency } = await admin
      .from("agencies")
      .select("id, custom_domain, domain_status")
      .eq("id", agencyId)
      .single();

    const agencyData = agency as unknown as AgencyDomainRow | null;
    if (!agencyData?.custom_domain) {
      return NextResponse.json({ domain_status: "pending", configured: false });
    }

    if (!process.env.VERCEL_TOKEN) {
      return NextResponse.json({ domain_status: agencyData.domain_status, configured: null });
    }

    const teamQuery = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : "";
    const response = await fetch(`${VERCEL_API}/v6/domains/${agencyData.custom_domain}/config${teamQuery}`, {
      headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
    });

    if (!response.ok) {
      return NextResponse.json({ domain_status: agencyData.domain_status, configured: false });
    }

    const data = (await response.json()) as VercelDomainConfigResponse;
    const configured = data.misconfigured === false;

    if (configured && agencyData.domain_status !== "active") {
      await admin.from("agencies").update({
        domain_status: "active",
        domain_verified_at: new Date().toISOString(),
      }).eq("id", agencyId);
    }

    return NextResponse.json({
      domain: agencyData.custom_domain,
      domain_status: configured ? "active" : agencyData.domain_status,
      configured,
    });
  }

  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await checkAllPending();
  return NextResponse.json(result);
}
