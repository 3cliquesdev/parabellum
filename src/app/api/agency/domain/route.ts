import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const VERCEL_API = "https://api.vercel.com";

function isValidDomain(d: string): boolean {
  return /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(d) && d.length < 253;
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { domain } = await request.json();
  if (!domain || !isValidDomain(domain)) {
    return NextResponse.json({ error: "Domínio inválido" }, { status: 400 });
  }

  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // Verificar permissão
  const { data: agencyUser } = await admin
    .from("agency_users")
    .select("agency_id, role")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"])
    .single() as { data: any };

  if (!agencyUser) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  // Registrar na Vercel (se token disponível)
  let vercelDomainId: string | null = null;
  if (process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID) {
    const teamQuery = process.env.VERCEL_TEAM_ID ? `&teamId=${process.env.VERCEL_TEAM_ID}` : "";
    const vercelRes = await fetch(
      `${VERCEL_API}/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains?${teamQuery}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: domain }),
      }
    );
    const vercelData = await vercelRes.json();
    if (vercelRes.ok) vercelDomainId = vercelData.uid ?? vercelData.name;
    else console.error("Vercel domain error:", vercelData);
  }

  // Salvar no banco
  await admin.from("agencies").update({
    custom_domain: domain,
    domain_status: vercelDomainId ? "verifying" : "pending",
    vercel_domain_id: vercelDomainId,
  }).eq("id", agencyUser.agency_id);

  return NextResponse.json({
    success: true,
    domain,
    status: vercelDomainId ? "verifying" : "pending",
    dns_instructions: {
      type: "CNAME",
      name: domain.split(".")[0],
      value: "cname.vercel-dns.com",
      ttl: 3600,
    },
  });
}
