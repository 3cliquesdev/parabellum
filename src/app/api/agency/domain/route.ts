import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LooseDatabase } from "@/types/database";

const VERCEL_API = "https://api.vercel.com";

interface DomainBody {
  domain?: string;
}

interface AgencyMembershipRow {
  agency_id: string;
  role: string;
}

interface VercelDomainResponse {
  uid?: string;
  name?: string;
}

function isValidDomain(domain: string): boolean {
  return /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(domain) && domain.length < 253;
}

async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

function createAdminClient() {
  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as DomainBody;
  if (!body.domain || !isValidDomain(body.domain)) {
    return NextResponse.json({ error: "Dominio invalido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: agencyUser } = await admin
    .from("agency_users")
    .select("agency_id, role")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"])
    .single();

  const membership = agencyUser as unknown as AgencyMembershipRow | null;
  if (!membership) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let vercelDomainId: string | null = null;
  if (process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID) {
    const teamQuery = process.env.VERCEL_TEAM_ID ? `&teamId=${process.env.VERCEL_TEAM_ID}` : "";
    const vercelResponse = await fetch(
      `${VERCEL_API}/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains?${teamQuery}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: body.domain }),
      }
    );

    const vercelData = (await vercelResponse.json()) as VercelDomainResponse;
    if (vercelResponse.ok) {
      vercelDomainId = vercelData.uid ?? vercelData.name ?? null;
    } else {
      console.error("Vercel domain error:", vercelData);
    }
  }

  await admin.from("agencies").update({
    custom_domain: body.domain,
    domain_status: vercelDomainId ? "verifying" : "pending",
    vercel_domain_id: vercelDomainId,
  }).eq("id", membership.agency_id);

  return NextResponse.json({
    success: true,
    domain: body.domain,
    status: vercelDomainId ? "verifying" : "pending",
    dns_instructions: {
      type: "CNAME",
      name: body.domain.split(".")[0],
      value: "cname.vercel-dns.com",
      ttl: 3600,
    },
  });
}
