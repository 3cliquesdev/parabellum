import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LooseDatabase } from "@/types/database";

interface ReferralLinkRow {
  id: string;
  agency_id: string;
  conversions?: number | null;
}

interface TenantMemberRow {
  tenant_id: string;
}

interface LinkAgencyBody {
  agency_id?: string;
  ref_slug?: string;
}

function createAuthClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
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
  const cookieStore = await cookies();
  const supabase = createAuthClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as LinkAgencyBody;
  const admin = createAdminClient();

  let resolvedAgencyId = body.agency_id ?? null;
  let linkId: string | null = null;

  if (!resolvedAgencyId && body.ref_slug) {
    const { data: link } = await admin
      .from("agency_referral_links")
      .select("agency_id, id")
      .eq("slug", body.ref_slug)
      .eq("ativo", true)
      .single();

    const currentLink = link as unknown as ReferralLinkRow | null;
    if (currentLink) {
      resolvedAgencyId = currentLink.agency_id;
      linkId = currentLink.id;
    }
  } else if (body.ref_slug) {
    const { data: link } = await admin
      .from("agency_referral_links")
      .select("id, agency_id, conversions")
      .eq("slug", body.ref_slug)
      .single();

    const currentLink = link as unknown as ReferralLinkRow | null;
    if (currentLink) {
      linkId = currentLink.id;
    }
  }

  if (!resolvedAgencyId) {
    return NextResponse.json({ error: "Agency not found" }, { status: 404 });
  }

  const { data: member } = await admin
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .single();

  const ownerMembership = member as unknown as TenantMemberRow | null;
  if (!ownerMembership) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  await admin.from("tenants").update({
    agency_id: resolvedAgencyId,
    referred_by_agency_id: resolvedAgencyId,
    signup_source: "agency_link",
  }).eq("id", ownerMembership.tenant_id);

  if (linkId) {
    const { data: link } = await admin
      .from("agency_referral_links")
      .select("id, agency_id, conversions")
      .eq("id", linkId)
      .single();

    const currentLink = link as unknown as ReferralLinkRow | null;
    if (currentLink) {
      await admin
        .from("agency_referral_links")
        .update({ conversions: (currentLink.conversions ?? 0) + 1 })
        .eq("id", linkId);
    }
  }

  return NextResponse.json({ success: true });
}
