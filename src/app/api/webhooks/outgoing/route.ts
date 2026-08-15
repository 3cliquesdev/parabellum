import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  assertTenantAdmin,
  assertTenantMember,
  createAdminClient,
} from "@/lib/auth/guard";
import { assertSafePublicUrl } from "@/lib/security/safe-fetch";

async function getWebhookTenantId(webhookId: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("webhook_configs")
    .select("tenant_id")
    .eq("id", webhookId)
    .maybeSingle();
  return (data as { tenant_id?: string } | null)?.tenant_id ?? null;
}

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ webhooks: [] });

  const auth = await assertTenantMember(tenantId);
  if (!auth.ok) return auth.response;
  const { data } = await auth.admin
    .from("webhook_configs")
    .select("id, tenant_id, nome, url, eventos, ativo, ultimo_envio, ultimo_erro, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  return NextResponse.json({ webhooks: data ?? [] });
}

export async function POST(request: NextRequest) {
  const { tenant_id, url, nome, eventos } = await request.json();
  if (!tenant_id || !url || !nome || !eventos?.length) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const auth = await assertTenantAdmin(tenant_id);
  if (!auth.ok) return auth.response;
  try {
    await assertSafePublicUrl(url);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "URL invalida",
    }, { status: 400 });
  }

  const secret = crypto.randomBytes(32).toString("hex");
  const { data, error } = await auth.admin
    .from("webhook_configs")
    .insert({ tenant_id, url, nome, eventos, secret })
    .select("id, tenant_id, nome, url, eventos, ativo, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ webhook: data });
}

export async function DELETE(request: NextRequest) {
  const { webhook_id } = await request.json();
  if (!webhook_id) return NextResponse.json({ error: "webhook_id required" }, { status: 400 });
  const tenantId = await getWebhookTenantId(webhook_id);
  if (!tenantId) return NextResponse.json({ error: "Webhook nao encontrado" }, { status: 404 });
  const auth = await assertTenantAdmin(tenantId);
  if (!auth.ok) return auth.response;
  await auth.admin.from("webhook_configs").delete().eq("id", webhook_id).eq("tenant_id", tenantId);
  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const { webhook_id, ativo } = await request.json();
  if (!webhook_id || typeof ativo !== "boolean") {
    return NextResponse.json({ error: "webhook_id e ativo sao obrigatorios" }, { status: 400 });
  }
  const tenantId = await getWebhookTenantId(webhook_id);
  if (!tenantId) return NextResponse.json({ error: "Webhook nao encontrado" }, { status: 404 });
  const auth = await assertTenantAdmin(tenantId);
  if (!auth.ok) return auth.response;
  await auth.admin.from("webhook_configs").update({ ativo }).eq("id", webhook_id).eq("tenant_id", tenantId);
  return NextResponse.json({ success: true });
}
