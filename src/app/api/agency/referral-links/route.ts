import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function admin() {
  return createServerClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { cookies: { getAll: () => [], setAll: () => {} } });
}

async function getAgencyId(userId: string) {
  const { data } = await admin().from("agency_users").select("agency_id, role").eq("user_id", userId).single();
  return data;
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyData = await getAgencyId(user.id);
  if (!agencyData) return NextResponse.json({ error: "Not an agency user" }, { status: 403 });

  const { data } = await admin().from("agency_referral_links").select("*").eq("agency_id", agencyData.agency_id).order("created_at", { ascending: false });
  return NextResponse.json({ links: data ?? [] });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyData = await getAgencyId(user.id);
  if (!agencyData || !["owner", "admin"].includes(agencyData.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { nome, slug } = await request.json();
  if (!slug) return NextResponse.json({ error: "slug é obrigatório" }, { status: 400 });

  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 50);

  const { data, error } = await admin().from("agency_referral_links")
    .insert({ agency_id: agencyData.agency_id, slug: cleanSlug, nome: nome || cleanSlug })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ link: data });
}

export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { link_id } = await request.json();
  await admin().from("agency_referral_links").update({ ativo: false }).eq("id", link_id);
  return NextResponse.json({ success: true });
}
