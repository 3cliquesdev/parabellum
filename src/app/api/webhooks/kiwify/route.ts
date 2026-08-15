import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { LooseDatabase } from "@/types/database";
import { ingestInboundMessage } from "@/lib/inbox/service";

function adminClient() {
  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

interface KiwifyCustomer {
  full_name?: string;
  email?: string;
  mobile?: string;
  phone_number?: string;
}

interface KiwifyProduct {
  product_name?: string;
  name?: string;
}

interface KiwifyWebhookBody {
  order_id?: string;
  order_status?: string;
  webhook_event_type?: string;
  Customer?: KiwifyCustomer;
  Product?: KiwifyProduct;
  Subscription?: { plan?: { name?: string } };
  Commissions?: { charge_amount?: number; product_base_price?: number };
  charge_amount?: number;
  amount?: number;
  product_type?: string;
}

// Valores REAIS de order_status, confirmados no codigo em producao do
// Parabellum (43mil+ eventos processados): 'paid' | 'order_approved' |
// 'subscription_renewed' | 'refused' | 'cart_abandoned' | 'payment_refused' |
// 'subscription_late' | 'subscription_card_declined' | 'refunded' |
// 'chargedback' | 'subscription_canceled'.
const STATUS_MAP: Record<string, string> = {
  paid: "pago",
  order_approved: "pago",
  subscription_renewed: "pago",

  cart_abandoned: "carrinho_abandonado",

  refused: "cartao_recusado",
  payment_refused: "cartao_recusado",

  subscription_late: "aguardando_pagamento",
  subscription_card_declined: "aguardando_pagamento",

  refunded: "reembolsado",
  chargedback: "chargeback",
  subscription_canceled: "cancelado",
};

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!process.env.KIWIFY_WEBHOOK_TOKEN || token !== process.env.KIWIFY_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "Token invalido" }, { status: 401 });
  }

  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as KiwifyWebhookBody;
  const rawStatus = (body.order_status ?? body.webhook_event_type ?? "").toLowerCase();
  const status = STATUS_MAP[rawStatus] ?? "outro";

  const customer = body.Customer;
  const produtoNome = body.Product?.product_name ?? body.Product?.name ?? body.Subscription?.plan?.name ?? "Produto Kiwify";
  // Kiwify manda o valor em centavos, dentro de Commissions (nao existe charge_amount na raiz).
  const valorCentavos = body.Commissions?.charge_amount ?? body.Commissions?.product_base_price ?? body.charge_amount ?? body.amount ?? 0;
  const valor = valorCentavos / 100;
  // Sinal estrutural (presenca do objeto Subscription) e mais confiavel que o
  // texto livre de product_type pra saber se e venda com ou sem assinatura.
  const tipoProduto = body.Subscription || body.product_type === "subscription" || body.product_type === "membership"
    ? "assinatura"
    : "curso";

  const admin = adminClient();

  let leadId: string | null = null;
  if (customer?.email || customer?.mobile || customer?.phone_number) {
    const result = await ingestInboundMessage({
      supabase: admin,
      tenantId,
      canal: "email",
      identity: { canal: "email", value: customer.email ?? null },
      lead: {
        name: customer.full_name ?? null,
        identities: customer.mobile || customer.phone_number
          ? [{ canal: "whatsapp", value: customer.mobile ?? customer.phone_number ?? null }]
          : [],
      },
      message: { text: `[Kiwify] ${produtoNome} — status: ${status}`, metadata: { canal: "kiwify", direction: "system" } },
    });
    leadId = result.lead?.id ?? null;
  }

  const { error } = await admin.from("vendas").upsert({
    tenant_id: tenantId,
    lead_id: leadId,
    produto_nome: produtoNome,
    valor,
    status,
    tipo_produto: tipoProduto,
    origem: "kiwify",
    external_id: body.order_id ?? null,
    raw_payload: body,
    paid_at: status === "pago" ? new Date().toISOString() : null,
  }, { onConflict: "tenant_id,origem,external_id" });

  if (error) {
    console.error("kiwify webhook: falha ao salvar venda:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, lead_id: leadId });
}
