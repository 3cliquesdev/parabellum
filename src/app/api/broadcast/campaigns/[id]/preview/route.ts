import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  await context.params; // consume params (not needed for preview)
  const cookieStore = await cookies();
  const auth = createServerClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createServerClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { cookies: { getAll: () => [], setAll: () => {} } });
  const { tenant_id, segmento_filtros } = await request.json();

  let query = admin.from("leads").select("id, whatsapp", { count: "exact" })
    .eq("tenant_id", tenant_id).not("whatsapp", "is", null);

  const filtros = segmento_filtros ?? {};
  if (filtros.status?.length) query = query.in("status", filtros.status);

  const { data: leads, count: total } = await query;
  const phones = (leads ?? []).map((l: any) => l.whatsapp?.replace(/\D/g, "")).filter(Boolean);

  let optouts = 0;
  if (phones.length > 0) {
    const { count } = await admin.from("lead_optouts")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant_id).in("phone_number", phones);
    optouts = count ?? 0;
  }

  const elegiveis = (total ?? 0) - optouts;
  return NextResponse.json({ total: total ?? 0, com_whatsapp: phones.length, opted_out: optouts, elegiveis: Math.max(0, elegiveis) });
}
