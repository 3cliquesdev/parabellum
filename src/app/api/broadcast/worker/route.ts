import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { sendWhatsAppTemplate } from "@/lib/whatsapp-template";

const OPTOUT_KEYWORDS = ["PARAR", "SAIR", "STOP", "CANCELAR", "DESCADASTRAR"];
const SAFE_RATE_MS = 100; // 10 msg/seg

function adminClient() {
  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

// Worker endpoint — chamado via fire-and-forget pelo /start
// Processa mensagens em lotes de 100
export async function POST(request: NextRequest) {
  // Verificar chave interna
  const key = request.headers.get("x-internal-key");
  if (key !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campaign_id, tenant_id } = await request.json();
  const supabase = adminClient();

  // Buscar campanha
  const { data: campaign } = await supabase.from("broadcast_campaigns")
    .select("*, meta_templates(template_name, language_code, variables_count)")
    .eq("id", campaign_id).single() as { data: any };

  if (!campaign || campaign.status !== "enviando") {
    return NextResponse.json({ status: "skipped" });
  }

  const template = campaign.meta_templates;

  // Buscar próximo lote de mensagens pending
  const { data: messages } = await supabase.from("broadcast_messages")
    .select("*").eq("campaign_id", campaign_id).eq("status", "pending")
    .lt("attempts", 3).order("enqueued_at", { ascending: true }).limit(100);

  if (!messages?.length) {
    // Verificar se há mensagens ainda pendentes (retry)
    const { count } = await supabase.from("broadcast_messages")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign_id).in("status", ["pending", "sending"]) as any;

    if (!count) {
      // Concluído — calcular métricas finais
      const { data: stats } = await supabase.from("broadcast_messages")
        .select("status").eq("campaign_id", campaign_id);
      const s = stats ?? [];
      await supabase.from("broadcast_campaigns").update({
        status: "concluido",
        concluido_em: new Date().toISOString(),
        total_enviados: s.filter((m: any) => ["sent","delivered","read"].includes(m.status)).length,
        total_entregues: s.filter((m: any) => ["delivered","read"].includes(m.status)).length,
        total_lidos: s.filter((m: any) => m.status === "read").length,
        total_falhas: s.filter((m: any) => m.status === "failed").length,
        total_optouts: s.filter((m: any) => m.status === "optout").length,
        updated_at: new Date().toISOString(),
      }).eq("id", campaign_id);
    }
    return NextResponse.json({ status: "done" });
  }

  let enviados = 0, falhas = 0;

  for (const msg of messages) {
    // Verificar se campanha ainda está ativa
    const { data: c } = await supabase.from("broadcast_campaigns").select("status").eq("id", campaign_id).single() as { data: any };
    if (c?.status !== "enviando") break;

    // Verificar opt-out de última hora
    const { data: optout } = await supabase.from("lead_optouts")
      .select("id").eq("tenant_id", tenant_id).eq("phone_number", msg.phone_number).maybeSingle();
    if (optout) {
      await supabase.from("broadcast_messages").update({ status: "optout", failed_at: new Date().toISOString() }).eq("id", msg.id);
      continue;
    }

    // Marcar como sending
    await supabase.from("broadcast_messages").update({ status: "sending", attempts: msg.attempts + 1 }).eq("id", msg.id);

    try {
      const result = await sendWhatsAppTemplate({
        tenant_id,
        phone_number: msg.phone_number,
        template_name: template.template_name,
        language_code: template.language_code,
        variables: msg.variables_filled,
      });

      await supabase.from("broadcast_messages").update({
        status: "sent", sent_at: new Date().toISOString(), meta_message_id: result.message_id,
      }).eq("id", msg.id);
      enviados++;

    } catch (err: any) {
      const code = err.code;
      if (code === 130429 || err.response?.status === 429) {
        // Rate limit — retry com backoff
        await supabase.from("broadcast_messages").update({
          status: "pending",
          next_retry_at: new Date(Date.now() + 60_000 * Math.pow(2, msg.attempts)).toISOString(),
        }).eq("id", msg.id);
        await new Promise(r => setTimeout(r, 5000)); // wait 5s on rate limit
      } else if ([131026, 131047].includes(code)) {
        // Opt-out implícito
        await supabase.from("lead_optouts").upsert({ tenant_id, phone_number: msg.phone_number, lead_id: msg.lead_id, source: "meta_block", campaign_id });
        await supabase.from("broadcast_messages").update({ status: "optout", error_code: String(code), failed_at: new Date().toISOString() }).eq("id", msg.id);
      } else if (msg.attempts >= 2) {
        await supabase.from("broadcast_messages").update({ status: "failed", error_code: String(code ?? "unknown"), error_message: err.message, failed_at: new Date().toISOString() }).eq("id", msg.id);
        falhas++;
      } else {
        await supabase.from("broadcast_messages").update({ status: "pending", next_retry_at: new Date(Date.now() + 30_000 * Math.pow(2, msg.attempts)).toISOString() }).eq("id", msg.id);
      }
    }

    // Throttle: 10 msg/seg
    await new Promise(r => setTimeout(r, SAFE_RATE_MS));
  }

  // Atualizar timestamp
  await supabase.from("broadcast_campaigns").update({
    updated_at: new Date().toISOString(),
  }).eq("id", campaign_id);

  // Continuar processamento se há mais mensagens
  if (messages.length === 100) {
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://liberty-crm-six.vercel.app"}/api/broadcast/worker`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-key": process.env.SUPABASE_SERVICE_ROLE_KEY! },
      body: JSON.stringify({ campaign_id, tenant_id }),
    }).catch(() => {});
  }

  return NextResponse.json({ enviados, falhas });
}
