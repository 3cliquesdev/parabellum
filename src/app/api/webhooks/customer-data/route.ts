import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { resolveOrLinkLead } from "@/lib/inbox/service";
import { hasExternalDataSecret, isExternalDataPayload, normalizeDigits, normalizeEmail } from "@/lib/external-customer-data";
import type { LooseDatabase } from "@/types/database";

function adminClient() {
  return createServerClient<LooseDatabase>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

export async function POST(request: NextRequest) {
  if (!hasExternalDataSecret(request.headers.get("x-3cliques-webhook-key"), "CUSTOMER_DATA_WEBHOOK_SECRET")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!isExternalDataPayload(payload)) return NextResponse.json({ error: "Payload invalido" }, { status: 400 });

  const admin = adminClient();
  const syncedAt = payload.occurred_at ?? new Date().toISOString();

  try {
    if (payload.event === "inventory.updated" && payload.inventory) {
      const { error } = await admin.from("external_inventory").upsert({
        tenant_id: payload.tenant_id,
        sku: payload.inventory.sku.trim(),
        produto_nome: payload.inventory.name ?? null,
        quantidade_disponivel: payload.inventory.available,
        quantidade_reservada: payload.inventory.reserved ?? 0,
        raw_payload: payload,
        updated_at: syncedAt,
      }, { onConflict: "tenant_id,sku" });
      if (error) throw error;
      return NextResponse.json({ ok: true, event: payload.event });
    }

    const customer = payload.customer!;
    const email = normalizeEmail(customer.email);
    const cpf = normalizeDigits(customer.cpf);
    const cnpj = normalizeDigits(customer.cnpj);
    let leadId: string | null = null;
    if (email) {
      const lead = await resolveOrLinkLead(admin, payload.tenant_id, { canal: "email", value: email }, { name: customer.nome ?? null, origem: "integracao_externa" });
      leadId = lead?.id ?? null;
    }

    // Campos ausentes nao entram no UPSERT. Isso e essencial para que um
    // evento de pedido nao zere o saldo que chegou em um evento anterior.
    const customerRow: Record<string, unknown> = {
      tenant_id: payload.tenant_id,
      external_customer_id: customer.external_id,
      nome: customer.nome ?? null,
      email_normalized: email,
      cpf_normalized: cpf,
      cnpj_normalized: cnpj,
      raw_payload: payload,
      updated_at: syncedAt,
    };
    if (leadId) customerRow.lead_id = leadId;
    if (payload.event === "customer.wallet.updated" && payload.wallet) {
      customerRow.wallet_balance = payload.wallet.balance;
      customerRow.wallet_currency = payload.wallet.currency ?? "BRL";
      customerRow.wallet_updated_at = syncedAt;
    }

    const { data: savedCustomer, error: customerError } = await admin.from("external_customers").upsert(customerRow, { onConflict: "tenant_id,external_customer_id" }).select("id").single();
    if (customerError || !savedCustomer) throw customerError ?? new Error("Cliente externo nao salvo");

    if (payload.event === "order.updated" && payload.order) {
      const rows = payload.order.items.map((item) => ({
        tenant_id: payload.tenant_id,
        customer_id: (savedCustomer as { id: string }).id,
        external_order_id: payload.order!.id,
        sku: item.sku,
        produto_nome: item.name ?? null,
        status: payload.order!.status,
        quantidade: item.quantity ?? 1,
        valor: item.unit_price ?? payload.order!.total ?? null,
        moeda: payload.order!.currency ?? "BRL",
        ordered_at: payload.order!.created_at ?? syncedAt,
        raw_payload: payload,
        updated_at: syncedAt,
      }));
      if (rows.length > 0) {
        const { error } = await admin.from("external_orders").upsert(rows, { onConflict: "tenant_id,external_order_id,sku" });
        if (error) throw error;
      }
    }

    return NextResponse.json({ ok: true, event: payload.event, customer_id: (savedCustomer as { id: string }).id, lead_id: leadId });
  } catch (error) {
    console.error("customer-data webhook error:", error);
    return NextResponse.json({ error: "Nao foi possivel sincronizar os dados" }, { status: 500 });
  }
}
