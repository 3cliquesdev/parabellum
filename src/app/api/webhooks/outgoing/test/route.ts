import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { assertTenantAdmin, createAdminClient } from "@/lib/auth/guard";
import { safePublicFetch } from "@/lib/security/safe-fetch";

interface WebhookTestBody {
  webhook_id?: string;
}

interface WebhookConfigRow {
  id: string;
  tenant_id: string;
  url: string;
  secret: string | null;
}

interface WebhookTestPayload {
  event: "test.ping";
  tenant_id: string;
  data: {
    message: string;
    timestamp: string;
  };
  timestamp: string;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

export async function POST(request: NextRequest) {
  const { webhook_id } = (await request.json().catch(() => ({}))) as WebhookTestBody;
  if (!webhook_id) return NextResponse.json({ error: "webhook_id required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: webhook } = await admin
    .from("webhook_configs")
    .select("*")
    .eq("id", webhook_id)
    .single();

  const webhookData = webhook as unknown as WebhookConfigRow | null;
  if (!webhookData) return NextResponse.json({ error: "Webhook nao encontrado" }, { status: 404 });
  const auth = await assertTenantAdmin(webhookData.tenant_id);
  if (!auth.ok) return auth.response;

  const timestamp = new Date().toISOString();
  const payload: WebhookTestPayload = {
    event: "test.ping",
    tenant_id: webhookData.tenant_id,
    data: { message: "Webhook do 3Cliques CRM funcionando!", timestamp },
    timestamp,
  };

  const signature = crypto
    .createHmac("sha256", webhookData.secret ?? "")
    .update(JSON.stringify(payload))
    .digest("hex");

  try {
    const response = await safePublicFetch(webhookData.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-3Cliques-Signature": `sha256=${signature}`,
        "X-3Cliques-Event": "test.ping",
        "User-Agent": "3CliquesPlatform/1.0",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    const success = response.ok;
    await admin.from("webhook_logs").insert({
      webhook_id,
      tenant_id: webhookData.tenant_id,
      evento: "test.ping",
      payload,
      status_code: response.status,
      sucesso: success,
    });
    await admin
      .from("webhook_configs")
      .update({
        ultimo_envio: new Date().toISOString(),
        ultimo_erro: success ? null : `HTTP ${response.status}`,
      })
      .eq("id", webhook_id);

    return NextResponse.json({
      sucesso: success,
      status: response.status,
      message: success ? "Webhook enviado com sucesso!" : `Erro HTTP ${response.status}`,
    });
  } catch (error) {
    await admin
      .from("webhook_configs")
      .update({ ultimo_erro: getErrorMessage(error) })
      .eq("id", webhook_id);

    return NextResponse.json({ sucesso: false, message: getErrorMessage(error) }, { status: 500 });
  }
}
