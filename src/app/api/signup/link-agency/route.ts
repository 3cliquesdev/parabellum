import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agency_id, ref_slug } = await request.json();

  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // Descobrir agency_id pelo ref_slug se não veio direto
  let resolvedAgencyId = agency_id;
  let linkId: string | null = null;

  if (!resolvedAgencyId && ref_slug) {
    const { data: link } = await admin
      .from("agency_referral_links").select("agency_id, id")
      .eq("slug", ref_slug).eq("ativo", true).single() as { data: any };
    if (link) { resolvedAgencyId = link.agency_id; linkId = link.id; }
  } else if (ref_slug) {
    const { data: link } = await admin
      .from("agency_referral_links").select("id")
      .eq("slug", ref_slug).single() as { data: any };
    if (link) linkId = link.id;
  }

  if (!resolvedAgencyId) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

  // Buscar o tenant criado pelo user
  const { data: member } = await admin
    .from("tenant_members").select("tenant_id")
    .eq("user_id", user.id).eq("role", "owner").single() as { data: any };

  if (!member) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  // Vincular tenant à agência
  await admin.from("tenants").update({
    agency_id: resolvedAgencyId,
    referred_by_agency_id: resolvedAgencyId,
    signup_source: "agency_link",
  }).eq("id", member.tenant_id);

  // Incrementar conversions no link
  if (linkId) {
    const { data: lnk } = await admin.from("agency_referral_links").select("conversions").eq("id", linkId).single() as { data: any };
    if (lnk) await admin.from("agency_referral_links").update({ conversions: (lnk.conversions ?? 0) + 1 }).eq("id", linkId);
  }

  return NextResponse.json({ success: true });
}
