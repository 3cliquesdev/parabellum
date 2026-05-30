import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  await context.params;
  const cookieStore = await cookies();
  const auth = createServerClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createServerClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { cookies: { getAll: () => [], setAll: () => {} } });
  const { tenant_id, segmento_filtros } = await request.json();
  const filtros = segmento_filtros ?? {};
  const fonte = filtros.fonte ?? "todos";

  let phones: string[] = [];
  let total = 0;
  let label_fonte = "";

  if (fonte === "inbox_24h") {
    // Leads que mandaram mensagem nas últimas 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: convs } = await admin.from("conversas")
      .select("lead_id, leads(whatsapp)")
      .eq("tenant_id", tenant_id).eq("canal", "whatsapp")
      .gte("updated_at", since) as { data: any[] };
    phones = (convs ?? []).map((c: any) => c.leads?.whatsapp?.replace(/\D/g, "")).filter(Boolean);
    total = phones.length;
    label_fonte = "Inbox ativo (últimas 24h)";

  } else if (fonte === "csv") {
    // Números importados via CSV (armazenados em filtros.csv_phones)
    phones = (filtros.csv_phones ?? []).map((p: string) => p.replace(/\D/g, "")).filter((p: string) => p.length >= 10);
    total = phones.length;
    label_fonte = "Planilha CSV importada";

  } else {
    // Pipeline ou todos
    let query = admin.from("leads").select("id, whatsapp", { count: "exact" })
      .eq("tenant_id", tenant_id).not("whatsapp", "is", null);
    if (fonte === "pipeline" && filtros.status?.length) query = query.in("status", filtros.status);
    const { data: leads, count } = await query;
    phones = (leads ?? []).map((l: any) => l.whatsapp?.replace(/\D/g, "")).filter(Boolean);
    total = count ?? 0;
    label_fonte = fonte === "pipeline" ? "Pipeline (filtrado)" : "Todos os leads";
  }

  // Verificar opt-outs
  let optouts = 0;
  if (phones.length > 0) {
    const { count } = await admin.from("lead_optouts")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant_id).in("phone_number", phones);
    optouts = count ?? 0;
  }

  const elegiveis = total - optouts;
  return NextResponse.json({
    total,
    com_whatsapp: phones.length,
    opted_out: optouts,
    elegiveis: Math.max(0, elegiveis),
    fonte: label_fonte,
    janela_gratuita: fonte === "inbox_24h",
  });
}
