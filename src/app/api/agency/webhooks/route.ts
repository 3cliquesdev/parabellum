import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LooseDatabase } from "@/types/database";

interface AgencyUserRow {
  agency_id: string;
}

interface AgencyWebhookRow {
  id: string;
  agency_id: string;
  nome: string;
  url: string;
  eventos: string[];
  created_at: string;
}

interface WebhookBody {
  nome?: string;
  url?: string;
  eventos?: string[];
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

async function getAgencyId(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agency_users")
    .select("agency_id")
    .eq("user_id", userId)
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return (data[0] as AgencyUserRow).agency_id;
}

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createAuthClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: "Not an agency user" }, { status: 403 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("agency_webhooks")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ webhooks: (data ?? []) as unknown as AgencyWebhookRow[] });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createAuthClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: "Not an agency user" }, { status: 403 });

  const body = (await request.json()) as WebhookBody;
  if (!body.nome || !body.url || !body.eventos?.length) {
    return NextResponse.json({ error: "nome, url e eventos são obrigatórios" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agency_webhooks")
    .insert({ agency_id: agencyId, nome: body.nome, url: body.url, eventos: body.eventos })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ webhook: data as unknown as AgencyWebhookRow });
}

export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createAuthClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { webhook_id?: string };
  if (!body.webhook_id) return NextResponse.json({ error: "webhook_id required" }, { status: 400 });
  const admin = createAdminClient();
  await admin.from("agency_webhooks").delete().eq("id", body.webhook_id);
  return NextResponse.json({ success: true });
}
