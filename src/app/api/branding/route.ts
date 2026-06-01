import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const DEFAULT_BRANDING = {
  display_name: "Liberty CRM",
  primary_color: "#9aea62",
  secondary_color: "#000000",
  logo_url: null,
  favicon_url: null,
  support_email: "suporte@libertycrm.com.br",
  terms_url: null,
  privacy_url: null,
  docs_url: null,
  is_custom: false,
};

const PLATFORM_DOMAINS = ["liberty-crm-six.vercel.app", "localhost", "libertycrm.com.br"];

function formatBranding(agency: any) {
  return {
    display_name: agency.display_name ?? "Liberty CRM",
    primary_color: agency.primary_color ?? "#9aea62",
    secondary_color: agency.secondary_color ?? "#000000",
    logo_url: agency.logo_url ?? null,
    favicon_url: agency.favicon_url ?? null,
    support_email: agency.support_email ?? "suporte@libertycrm.com.br",
    terms_url: agency.terms_url ?? null,
    privacy_url: agency.privacy_url ?? null,
    docs_url: agency.docs_url ?? null,
    is_custom: true,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hostname = searchParams.get("hostname") ?? request.headers.get("x-forwarded-host") ?? "";
  const agencyId = searchParams.get("agency_id");

  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // Lookup direto por agency_id (quando no domínio da Liberty)
  if (agencyId) {
    try {
      const { data: agency } = await admin
        .from("agencies")
        .select("display_name, primary_color, secondary_color, logo_url, favicon_url, support_email, terms_url, privacy_url, docs_url")
        .eq("id", agencyId)
        .single();
      if (agency) return NextResponse.json(formatBranding(agency));
    } catch { /* fallback */ }
    return NextResponse.json(DEFAULT_BRANDING);
  }

  const isPlatform = !hostname || PLATFORM_DOMAINS.some(d => hostname === d || hostname.endsWith("." + d));
  if (isPlatform) {
    return NextResponse.json(DEFAULT_BRANDING);
  }

  try {
    const { data: agency } = await admin
      .from("agencies")
      .select("display_name, primary_color, secondary_color, logo_url, favicon_url, support_email, terms_url, privacy_url, docs_url, status, domain_status")
      .eq("custom_domain", hostname)
      .eq("domain_status", "active")
      .eq("status", "active")
      .single();

    if (!agency) return NextResponse.json(DEFAULT_BRANDING);
    return NextResponse.json(formatBranding(agency));
  } catch {
    return NextResponse.json(DEFAULT_BRANDING);
  }
}
