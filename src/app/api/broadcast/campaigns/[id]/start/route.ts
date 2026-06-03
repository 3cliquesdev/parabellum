import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LooseDatabase } from "@/types/database";

interface CampaignTemplate {
  status?: string | null;
  template_name?: string | null;
  language_code?: string | null;
  variables_count?: number | null;
}

interface SegmentFilters {
  fonte?: "todos" | "inbox_24h" | "csv" | "pipeline";
  status?: string[];
  csv_phones?: string[];
  csv_names?: string[];
}

interface BroadcastCampaign {
  id: string;
  tenant_id: string;
  status: string;
  meta_templates?: CampaignTemplate | null;
  segmento_filtros?: SegmentFilters | null;
  template_variables?: Record<string, string> | null;
}

interface LeadRecipient {
  id: string;
  whatsapp: string | null;
  nome: string | null;
  servico_interesse: string | null;
  email: string | null;
}

interface InboxConversationRow {
  lead_id: string;
  leads?: LeadRecipient | null;
}

interface OptOutRow {
  phone_number: string;
}

interface BroadcastMessageInsert {
  campaign_id: string;
  tenant_id: string;
  lead_id: string;
  phone_number: string;
  variables_filled: Record<string, string>;
  status: "pending";
}

function getLeadValue(lead: LeadRecipient, fieldName: string): string {
  const rawValue = lead[fieldName as keyof LeadRecipient];
  return typeof rawValue === "string" ? rawValue : "";
}

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = await context.params;
  const cookieStore = await cookies();
  const auth = createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: campaign } = await admin
    .from("broadcast_campaigns")
    .select("*, meta_templates(*)")
    .eq("id", campaignId)
    .single();

  const currentCampaign = campaign as unknown as BroadcastCampaign | null;
  if (!currentCampaign) return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
  if (currentCampaign.status !== "rascunho" && currentCampaign.status !== "agendado") {
    return NextResponse.json({ error: "Campanha não pode ser iniciada neste status" }, { status: 400 });
  }
  if (currentCampaign.meta_templates?.status !== "approved") {
    return NextResponse.json({ error: "Template não aprovado pela Meta. Aguarde a aprovação antes de disparar." }, { status: 400 });
  }

  const tenantId = currentCampaign.tenant_id;
  const filtros = currentCampaign.segmento_filtros ?? {};
  const fonte = filtros.fonte ?? "todos";

  let leads: LeadRecipient[] = [];

  if (fonte === "inbox_24h") {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: convs } = await admin
      .from("conversas")
      .select("lead_id, leads(id, whatsapp, nome, servico_interesse, email)")
      .eq("tenant_id", tenantId)
      .eq("canal", "whatsapp")
      .gte("updated_at", since);

    leads = ((convs ?? []) as unknown as InboxConversationRow[])
      .map((conversation) => conversation.leads)
      .filter((lead): lead is LeadRecipient => Boolean(lead));
  } else if (fonte === "csv") {
    const csvPhones = (filtros.csv_phones ?? [])
      .map((phone) => phone.replace(/\D/g, ""))
      .filter((phone) => phone.length >= 10);

    leads = csvPhones.map((phone, index) => ({
      id: `csv-${index}`,
      whatsapp: phone,
      nome: filtros.csv_names?.[index] ?? `Contato ${phone}`,
      email: null,
      servico_interesse: null,
    }));
  } else {
    let query = admin
      .from("leads")
      .select("id, whatsapp, nome, servico_interesse, email")
      .eq("tenant_id", tenantId)
      .not("whatsapp", "is", null);

    if (fonte === "pipeline" && filtros.status?.length) {
      query = query.in("status", filtros.status);
    }

    const { data } = await query;
    leads = (data ?? []) as unknown as LeadRecipient[];
  }

  if (leads.length === 0) {
    return NextResponse.json({ error: "Nenhum lead elegível encontrado" }, { status: 400 });
  }

  const phones = leads
    .map((lead) => lead.whatsapp?.replace(/\D/g, ""))
    .filter((phone): phone is string => Boolean(phone));
  const { data: optoutList } = await admin
    .from("lead_optouts")
    .select("phone_number")
    .eq("tenant_id", tenantId)
    .in("phone_number", phones);
  const optoutSet = new Set(((optoutList ?? []) as unknown as OptOutRow[]).map((optout) => optout.phone_number));

  const elegiveis = leads.filter((lead) => {
    const phone = lead.whatsapp?.replace(/\D/g, "");
    return Boolean(phone) && !optoutSet.has(phone!);
  });

  if (elegiveis.length === 0) {
    return NextResponse.json({ error: "Todos os leads estão na lista de opt-out" }, { status: 400 });
  }

  const templateVars = currentCampaign.template_variables ?? {};
  const messages: BroadcastMessageInsert[] = elegiveis
    .map((lead) => {
      const phone = lead.whatsapp?.replace(/\D/g, "");
      if (!phone) return null;

      const filled: Record<string, string> = {};
      for (const [variableNumber, field] of Object.entries(templateVars)) {
        filled[variableNumber] = getLeadValue(lead, field);
      }

      return {
        campaign_id: campaignId,
        tenant_id: tenantId,
        lead_id: lead.id,
        phone_number: phone,
        variables_filled: filled,
        status: "pending",
      };
    })
    .filter((message): message is BroadcastMessageInsert => Boolean(message));

  for (let index = 0; index < messages.length; index += 500) {
    await admin
      .from("broadcast_messages")
      .insert(messages.slice(index, index + 500) as unknown as Record<string, unknown>[]);
  }

  await admin.from("broadcast_campaigns").update({
    status: "enviando",
    total_destinatarios: elegiveis.length,
    total_enfileirados: elegiveis.length,
    iniciado_em: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", campaignId);

  fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://liberty-crm-six.vercel.app"}/api/broadcast/worker`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-key": process.env.SUPABASE_SERVICE_ROLE_KEY! },
    body: JSON.stringify({ campaign_id: campaignId, tenant_id: tenantId }),
  }).catch(() => {});

  return NextResponse.json({ success: true, elegiveis: elegiveis.length });
}
