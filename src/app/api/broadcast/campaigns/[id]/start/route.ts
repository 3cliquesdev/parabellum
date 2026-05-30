import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = await context.params;
  const cookieStore = await cookies();
  const auth = createServerClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createServerClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { cookies: { getAll: () => [], setAll: () => {} } });

  const { data: campaign } = await admin.from("broadcast_campaigns")
    .select("*, meta_templates(*)").eq("id", campaignId).single() as { data: any };

  if (!campaign) return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
  if (campaign.status !== "rascunho" && campaign.status !== "agendado") {
    return NextResponse.json({ error: "Campanha não pode ser iniciada neste status" }, { status: 400 });
  }
  if (campaign.meta_templates?.status !== "approved") {
    return NextResponse.json({ error: "Template não aprovado pela Meta. Aguarde a aprovação antes de disparar." }, { status: 400 });
  }

  const tenantId = campaign.tenant_id;
  const filtros = campaign.segmento_filtros ?? {};
  const fonte = filtros.fonte ?? "todos";

  // Buscar destinatários baseado na fonte
  let leads: any[] = [];

  if (fonte === "inbox_24h") {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: convs } = await admin.from("conversas")
      .select("lead_id, leads(id, whatsapp, nome, servico_interesse, email)")
      .eq("tenant_id", tenantId).eq("canal", "whatsapp").gte("updated_at", since) as { data: any[] };
    leads = (convs ?? []).map((c: any) => c.leads).filter(Boolean);

  } else if (fonte === "csv") {
    // CSV phones → criar leads temporários (só com whatsapp)
    const csvPhones: string[] = (filtros.csv_phones ?? []).map((p: string) => p.replace(/\D/g, "")).filter((p: string) => p.length >= 10);
    leads = csvPhones.map((phone, i) => ({
      id: `csv-${i}`, whatsapp: phone,
      nome: filtros.csv_names?.[i] ?? `Contato ${phone}`,
      email: null, servico_interesse: null,
    }));

  } else {
    let query = admin.from("leads").select("id, whatsapp, nome, servico_interesse, email")
      .eq("tenant_id", tenantId).not("whatsapp", "is", null);
    if (fonte === "pipeline" && filtros.status?.length) query = query.in("status", filtros.status);
    const { data } = await query;
    leads = data ?? [];
  }

  if (!leads.length) return NextResponse.json({ error: "Nenhum lead elegível encontrado" }, { status: 400 });

  const phones = leads.map((l: any) => l.whatsapp?.replace(/\D/g, "")).filter(Boolean);
  const { data: optoutList } = await admin.from("lead_optouts").select("phone_number").eq("tenant_id", tenantId).in("phone_number", phones);
  const optoutSet = new Set((optoutList ?? []).map((o: any) => o.phone_number));

  const elegiveis = leads.filter((l: any) => {
    const phone = l.whatsapp?.replace(/\D/g, "");
    return phone && !optoutSet.has(phone);
  });

  if (!elegiveis.length) return NextResponse.json({ error: "Todos os leads estão na lista de opt-out" }, { status: 400 });

  const templateVars = campaign.template_variables ?? {};
  const messages = elegiveis.map((lead: any) => {
    const phone = lead.whatsapp.replace(/\D/g, "");
    const filled: Record<string, string> = {};
    Object.entries(templateVars).forEach(([varNum, field]: [string, any]) => { filled[varNum] = (lead as any)[field] ?? ""; });
    return { campaign_id: campaignId, tenant_id: tenantId, lead_id: lead.id, phone_number: phone, variables_filled: filled, status: "pending" };
  });

  for (let i = 0; i < messages.length; i += 500) {
    await admin.from("broadcast_messages").insert(messages.slice(i, i + 500));
  }

  await admin.from("broadcast_campaigns").update({
    status: "enviando", total_destinatarios: elegiveis.length, total_enfileirados: elegiveis.length,
    iniciado_em: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq("id", campaignId);

  fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://liberty-crm-six.vercel.app"}/api/broadcast/worker`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-key": process.env.SUPABASE_SERVICE_ROLE_KEY! },
    body: JSON.stringify({ campaign_id: campaignId, tenant_id: tenantId }),
  }).catch(() => {});

  return NextResponse.json({ success: true, elegiveis: elegiveis.length });
}
