import { createServerClient } from "@supabase/ssr";
import crypto from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminClient() {
  return createServerClient<any>(SUPABASE_URL, SERVICE_ROLE_KEY, { cookies: { getAll: () => [], setAll: () => {} } });
}

export type WebhookEvent =
  | "lead.created" | "lead.status_changed" | "lead.won" | "lead.lost"
  | "message.received" | "message.sent"
  | "activity.created" | "conversation.started";

export async function dispatchWebhook(tenantId: string, evento: WebhookEvent, data: Record<string, unknown>) {
  try {
    const supabase = adminClient();
    const { data: webhooks } = await supabase
      .from("webhook_configs")
      .select("id, url, secret")
      .eq("tenant_id", tenantId)
      .eq("ativo", true)
      .contains("eventos", [evento]);

    if (!webhooks?.length) return;

    const payload = { event: evento, tenant_id: tenantId, data, timestamp: new Date().toISOString() };
    const body = JSON.stringify(payload);

    await Promise.allSettled(
      webhooks.map(async (wh: any) => {
        const signature = crypto.createHmac("sha256", wh.secret ?? "").update(body).digest("hex");
        try {
          const res = await fetch(wh.url, {
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
          const sucesso = res.ok;
          await supabase.from("webhook_logs").insert({ webhook_id: wh.id, tenant_id: tenantId, evento, payload, status_code: res.status, sucesso });
          await supabase.from("webhook_configs").update({ ultimo_envio: new Date().toISOString(), ultimo_erro: sucesso ? null : `HTTP ${res.status}` }).eq("id", wh.id);
        } catch (err: any) {
          await supabase.from("webhook_configs").update({ ultimo_erro: err.message }).eq("id", wh.id);
        }
      })
    );
  } catch (err) {
    console.error("dispatchWebhook error:", err);
  }
}
