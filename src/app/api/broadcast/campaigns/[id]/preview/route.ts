import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LooseDatabase } from "@/types/database";

interface PreviewFilters {
  fonte?: string;
  status?: string[];
  csv_phones?: string[];
}

interface PreviewBody {
  tenant_id?: string;
  segmento_filtros?: PreviewFilters;
}

interface LeadRow {
  id: string;
  whatsapp: string | null;
}

interface RelatedLeadRow {
  whatsapp: string | null;
}

interface ConversationRow {
  lead_id: string | null;
  leads: RelatedLeadRow | RelatedLeadRow[] | null;
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 10 ? cleaned : null;
}

function getRelatedLeadPhone(leads: ConversationRow["leads"]): string | null {
  if (Array.isArray(leads)) {
    return normalizePhone(leads[0]?.whatsapp);
  }

  return normalizePhone(leads?.whatsapp);
}

export async function POST(request: NextRequest) {
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

  const body = (await request.json().catch(() => ({}))) as PreviewBody;
  if (!body.tenant_id) {
    return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  }

  const filters = body.segmento_filtros ?? {};
  const source = filters.fonte ?? "todos";

  let phones: string[] = [];
  let total = 0;
  let sourceLabel = "";

  if (source === "inbox_24h") {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: conversations } = await admin
      .from("conversas")
      .select("lead_id, leads(whatsapp)")
      .eq("tenant_id", body.tenant_id)
      .eq("canal", "whatsapp")
      .gte("updated_at", since);

    phones = ((conversations ?? []) as unknown as ConversationRow[])
      .map((conversation) => getRelatedLeadPhone(conversation.leads))
      .filter((phone): phone is string => Boolean(phone));

    total = phones.length;
    sourceLabel = "Inbox ativo (ultimas 24h)";
  } else if (source === "csv") {
    phones = (filters.csv_phones ?? [])
      .map((phone) => normalizePhone(phone))
      .filter((phone): phone is string => Boolean(phone));

    total = phones.length;
    sourceLabel = "Planilha CSV importada";
  } else {
    let query = admin
      .from("leads")
      .select("id, whatsapp", { count: "exact" })
      .eq("tenant_id", body.tenant_id)
      .not("whatsapp", "is", null);

    if (source === "pipeline" && filters.status?.length) {
      query = query.in("status", filters.status);
    }

    const { data: leads, count } = await query;
    phones = ((leads ?? []) as unknown as LeadRow[])
      .map((lead) => normalizePhone(lead.whatsapp))
      .filter((phone): phone is string => Boolean(phone));

    total = count ?? 0;
    sourceLabel = source === "pipeline" ? "Pipeline (filtrado)" : "Todos os leads";
  }

  let optouts = 0;
  if (phones.length > 0) {
    const { count } = await admin
      .from("lead_optouts")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", body.tenant_id)
      .in("phone_number", phones);

    optouts = count ?? 0;
  }

  const eligible = total - optouts;
  return NextResponse.json({
    total,
    com_whatsapp: phones.length,
    opted_out: optouts,
    elegiveis: Math.max(0, eligible),
    fonte: sourceLabel,
    janela_gratuita: source === "inbox_24h",
  });
}
