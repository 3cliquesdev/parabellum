import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LooseDatabase } from "@/types/database";

interface AgencyMembershipRow {
  agency_id: string;
  role: string;
}

interface ReferralLinkRow {
  id: string;
  agency_id: string;
  slug: string;
  nome: string;
  ativo?: boolean;
}

interface CreateReferralLinkBody {
  nome?: string;
  slug?: string;
}

interface DeleteReferralLinkBody {
  link_id?: string;
}

function createAdminClient() {
  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

async function getAgencyMembership(userId: string): Promise<AgencyMembershipRow | null> {
  const { data, error } = await createAdminClient()
    .from("agency_users")
    .select("agency_id, role")
    .eq("user_id", userId)
    .limit(1);

  const memberships = (data ?? []) as unknown as AgencyMembershipRow[];
  if (error || memberships.length === 0) return null;
  return memberships[0];
}

export async function GET() {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyMembership = await getAgencyMembership(user.id);
  if (!agencyMembership) return NextResponse.json({ error: "Not an agency user" }, { status: 403 });

  const { data } = await createAdminClient()
    .from("agency_referral_links")
    .select("*")
    .eq("agency_id", agencyMembership.agency_id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ links: (data ?? []) as unknown as ReferralLinkRow[] });
}

export async function POST(request: NextRequest) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyMembership = await getAgencyMembership(user.id);
  if (!agencyMembership || !["owner", "admin"].includes(agencyMembership.role)) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as CreateReferralLinkBody;
  if (!body.slug) return NextResponse.json({ error: "slug e obrigatorio" }, { status: 400 });

  const cleanSlug = body.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 50);

  const { data, error } = await createAdminClient()
    .from("agency_referral_links")
    .insert({
      agency_id: agencyMembership.agency_id,
      slug: cleanSlug,
      nome: body.nome || cleanSlug,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ link: data as unknown as ReferralLinkRow | null });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as DeleteReferralLinkBody;
  if (!body.link_id) return NextResponse.json({ error: "link_id required" }, { status: 400 });

  await createAdminClient()
    .from("agency_referral_links")
    .update({ ativo: false })
    .eq("id", body.link_id);

  return NextResponse.json({ success: true });
}
