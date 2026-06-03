import { createServerClient } from "@supabase/ssr";
import crypto from "crypto";
import type { LooseDatabase } from "@/types/database";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface WebhookConfigRow {
  id: string;
  url: string;
  secret: string | null;
}

export type WebhookEvent =
  | "lead.created"
  | "lead.status_changed"
  | "lead.won"
  | "lead.lost"
  | "message.received"
  | "message.sent"
  | "activity.created"
  | "conversation.started";

function createAdminClient() {
  return createServerClient<LooseDatabase>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

export async function dispatchWebhook(tenantId: string, evento: WebhookEvent, data: Record<string, unknown>) {
  try {
    const supabase = createAdminClient();
    const { data: webhooks } = await supabase
      .from("webhook_configs")
      .select("id, url, secret")
      .eq("tenant_id", tenantId)
      .eq("ativo", true)
      .contains("eventos", [evento]);

    const webhookRows = (webhooks ?? []) as unknown as WebhookConfigRow[];
    if (webhookRows.length === 0) return;

    const payload = { event: evento, tenant_id: tenantId, data, timestamp: new Date().toISOString() };
    const body = JSON.stringify(payload);

    await Promise.allSettled(
      webhookRows.map(async (webhook) => {
        const signature = crypto.createHmac("sha256", webhook.secret ?? "").update(body).digest("hex");

        try {
          const response = await fetch(webhook.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Liberty-Signature": `sha256=${signature}`,
              "X-Liberty-Event": evento,
              "User-Agent": "LibertyPlatform/1.0",
            },
            body,
            signal: AbortSignal.timeout(8000),
          });

          const success = response.ok;
          await supabase.from("webhook_logs").insert({
            webhook_id: webhook.id,
            tenant_id: tenantId,
            evento,
            payload,
            status_code: response.status,
            sucesso: success,
          });
          await supabase.from("webhook_configs").update({
            ultimo_envio: new Date().toISOString(),
            ultimo_erro: success ? null : `HTTP ${response.status}`,
          }).eq("id", webhook.id);
        } catch (error) {
          await supabase
            .from("webhook_configs")
            .update({ ultimo_erro: getErrorMessage(error) })
            .eq("id", webhook.id);
        }
      })
    );
  } catch (error) {
    console.error("dispatchWebhook error:", error);
  }
}
