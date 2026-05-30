import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crypto from "crypto";

async function getClients(request: NextRequest) {
  const cookieStore = await cookies();
  const auth = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
  return { auth, admin };
}

// GET — listar webhooks do tenant
export async function GET(request: NextRequest) {
  const { auth, admin } = await getClients(request);
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = request.nextUrl.searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ webhooks: [] });

  const { data } = await admin.from("webhook_configs").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  return NextResponse.json({ webhooks: data ?? [] });
}

// POST — criar webhook
export async function POST(request: NextRequest) {
  const { auth, admin } = await getClients(request);
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tenant_id, url, nome, eventos } = await request.json();
  if (!tenant_id || !url || !nome || !eventos?.length) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data, error } = await admin.from("webhook_configs").insert({ tenant_id, url, nome, eventos }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ webhook: data });
}

// DELETE — remover webhook
export async function DELETE(request: NextRequest) {
  const { auth, admin } = await getClients(request);
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { webhook_id } = await request.json();
  await admin.from("webhook_configs").delete().eq("id", webhook_id);
  return NextResponse.json({ success: true });
}

// PATCH — toggle ativo/inativo
export async function PATCH(request: NextRequest) {
  const { auth, admin } = await getClients(request);
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { webhook_id, ativo } = await request.json();
  await admin.from("webhook_configs").update({ ativo }).eq("id", webhook_id);
  return NextResponse.json({ success: true });
}
