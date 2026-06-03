import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { sendWhatsAppTemplate } from "@/lib/whatsapp-template";
import type { LooseDatabase } from "@/types/database";

const SAFE_RATE_MS = 100;

interface WorkerPayload {
  campaign_id: string;
  tenant_id: string;
}

interface CampaignTemplate {
  template_name: string;
  language_code: string;
  variables_count?: number | null;
}

interface BroadcastCampaign {
  id: string;
  status: string;
  meta_templates: CampaignTemplate | null;
}

interface BroadcastMessageRow {
  id: string;
  lead_id: string | null;
  phone_number: string;
  variables_filled: Record<string, string>;
  attempts: number;
  status: string;
}

interface BroadcastStatusRow {
  status: string;
}

interface WorkerError extends Error {
  code?: number;
  response?: {
    status?: number;
  };
}

function adminClient() {
  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

function isWorkerPayload(value: unknown): value is WorkerPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as WorkerPayload).campaign_id === "string" &&
    typeof (value as WorkerPayload).tenant_id === "string"
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  const key = request.headers.get("x-internal-key");
  if (key !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  if (!isWorkerPayload(payload)) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const { campaign_id, tenant_id } = payload;
  const supabase = adminClient();

  const { data: campaign } = await supabase
    .from("broadcast_campaigns")
    .select("*, meta_templates(template_name, language_code, variables_count)")
    .eq("id", campaign_id)
    .single();

  const currentCampaign = campaign as unknown as BroadcastCampaign | null;
  if (!currentCampaign || currentCampaign.status !== "enviando") {
    return NextResponse.json({ status: "skipped" });
  }

  const template = currentCampaign.meta_templates;
  if (!template) {
    return NextResponse.json({ error: "Template da campanha não encontrado" }, { status: 400 });
  }

  const { data: messages } = await supabase
    .from("broadcast_messages")
    .select("*")
    .eq("campaign_id", campaign_id)
    .eq("status", "pending")
    .lt("attempts", 3)
    .order("enqueued_at", { ascending: true })
    .limit(100);

  const pendingMessages = (messages ?? []) as unknown as BroadcastMessageRow[];

  if (pendingMessages.length === 0) {
    const { count } = await supabase
      .from("broadcast_messages")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign_id)
      .in("status", ["pending", "sending"]);

    if (!count) {
      const { data: stats } = await supabase
        .from("broadcast_messages")
        .select("status")
        .eq("campaign_id", campaign_id);
      const statusRows = (stats ?? []) as unknown as BroadcastStatusRow[];

      await supabase.from("broadcast_campaigns").update({
        status: "concluido",
        concluido_em: new Date().toISOString(),
        total_enviados: statusRows.filter((message) => ["sent", "delivered", "read"].includes(message.status)).length,
        total_entregues: statusRows.filter((message) => ["delivered", "read"].includes(message.status)).length,
        total_lidos: statusRows.filter((message) => message.status === "read").length,
        total_falhas: statusRows.filter((message) => message.status === "failed").length,
        total_optouts: statusRows.filter((message) => message.status === "optout").length,
        updated_at: new Date().toISOString(),
      }).eq("id", campaign_id);
    }

    return NextResponse.json({ status: "done" });
  }

  let enviados = 0;
  let falhas = 0;

  for (const message of pendingMessages) {
    const { data: currentCampaignStatus } = await supabase
      .from("broadcast_campaigns")
      .select("status")
      .eq("id", campaign_id)
      .single();

    const refreshedCampaign = currentCampaignStatus as Pick<BroadcastCampaign, "status"> | null;
    if (refreshedCampaign?.status !== "enviando") {
      break;
    }

    const { data: optout } = await supabase
      .from("lead_optouts")
      .select("id")
      .eq("tenant_id", tenant_id)
      .eq("phone_number", message.phone_number)
      .maybeSingle();

    if (optout) {
      await supabase.from("broadcast_messages").update({
        status: "optout",
        failed_at: new Date().toISOString(),
      }).eq("id", message.id);
      continue;
    }

    await supabase.from("broadcast_messages").update({
      status: "sending",
      attempts: message.attempts + 1,
    }).eq("id", message.id);

    try {
      const result = await sendWhatsAppTemplate({
        tenant_id,
        phone_number: message.phone_number,
        template_name: template.template_name,
        language_code: template.language_code,
        variables: message.variables_filled,
      });

      await supabase.from("broadcast_messages").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        meta_message_id: result.message_id,
      }).eq("id", message.id);
      enviados += 1;
    } catch (error) {
      const workerError = error as WorkerError;
      const code = workerError.code;

      if (code === 130429 || workerError.response?.status === 429) {
        await supabase.from("broadcast_messages").update({
          status: "pending",
          next_retry_at: new Date(Date.now() + 60_000 * Math.pow(2, message.attempts)).toISOString(),
        }).eq("id", message.id);
        await sleep(5000);
      } else if (code === 131026 || code === 131047) {
        await supabase.from("lead_optouts").upsert({
          tenant_id,
          phone_number: message.phone_number,
          lead_id: message.lead_id,
          source: "meta_block",
          campaign_id,
        });
        await supabase.from("broadcast_messages").update({
          status: "optout",
          error_code: String(code),
          failed_at: new Date().toISOString(),
        }).eq("id", message.id);
      } else if (message.attempts >= 2) {
        await supabase.from("broadcast_messages").update({
          status: "failed",
          error_code: String(code ?? "unknown"),
          error_message: workerError.message,
          failed_at: new Date().toISOString(),
        }).eq("id", message.id);
        falhas += 1;
      } else {
        await supabase.from("broadcast_messages").update({
          status: "pending",
          next_retry_at: new Date(Date.now() + 30_000 * Math.pow(2, message.attempts)).toISOString(),
        }).eq("id", message.id);
      }
    }

    await sleep(SAFE_RATE_MS);
  }

  await supabase.from("broadcast_campaigns").update({
    updated_at: new Date().toISOString(),
  }).eq("id", campaign_id);

  if (pendingMessages.length === 100) {
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://liberty-crm-six.vercel.app"}/api/broadcast/worker`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-key": process.env.SUPABASE_SERVICE_ROLE_KEY! },
      body: JSON.stringify({ campaign_id, tenant_id }),
    }).catch(() => {});
  }

  return NextResponse.json({ enviados, falhas });
}
