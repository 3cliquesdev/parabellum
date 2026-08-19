import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { hasExternalDataSecret, normalizeDigits, normalizeEmail } from "@/lib/external-customer-data";
import type { LooseDatabase } from "@/types/database";

function adminClient() {
  return createServerClient<LooseDatabase>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

export async function POST(request: NextRequest) {
  if (!hasExternalDataSecret(request.headers.get("x-3cliques-query-key"), "CUSTOMER_DATA_QUERY_SECRET")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const tenantId = typeof body.tenant_id === "string" ? body.tenant_id : null;
  const leadId = typeof body.lead_id === "string" ? body.lead_id : null;
  const orderId = typeof body.order_id === "string" ? body.order_id : null;
  const sku = typeof body.sku === "string" ? body.sku.trim() : null;
  const email = normalizeEmail(body.email);
  const cpf = normalizeDigits(body.cpf);
  const cnpj = normalizeDigits(body.cnpj);
  const externalCustomerId = typeof body.external_customer_id === "string" ? body.external_customer_id : null;
  if (!tenantId || (!orderId && !sku && !leadId && !email && !cpf && !cnpj && !externalCustomerId)) {
    return NextResponse.json({ error: "Informe tenant_id e ao menos um identificador" }, { status: 400 });
  }

  const admin = adminClient();
  if (orderId) {
    const { data, error } = await admin.from("external_orders").select("*").eq("tenant_id", tenantId).eq("external_order_id", orderId).limit(50);
    if (error) return NextResponse.json({ error: "Consulta indisponivel" }, { status: 500 });
    return NextResponse.json({ orders: data ?? [] });
  }
  if (sku && !email && !cpf && !cnpj && !externalCustomerId) {
    const { data, error } = await admin.from("external_inventory").select("*").eq("tenant_id", tenantId).eq("sku", sku).maybeSingle();
    if (error) return NextResponse.json({ error: "Consulta indisponivel" }, { status: 500 });
    return NextResponse.json({ inventory: data ?? null });
  }

  let customerQuery = admin.from("external_customers").select("*").eq("tenant_id", tenantId).limit(1);
  if (leadId) customerQuery = customerQuery.eq("lead_id", leadId);
  else if (email) customerQuery = customerQuery.eq("email_normalized", email);
  else if (cpf) customerQuery = customerQuery.eq("cpf_normalized", cpf);
  else if (cnpj) customerQuery = customerQuery.eq("cnpj_normalized", cnpj);
  else customerQuery = customerQuery.eq("external_customer_id", externalCustomerId!);
  const { data: customer, error } = await customerQuery.maybeSingle();
  if (error || !customer) return NextResponse.json({ customer: null, orders: [] });

  const customerId = (customer as { id: string }).id;
  const { data: orders } = await admin.from("external_orders").select("*").eq("tenant_id", tenantId).eq("customer_id", customerId).order("ordered_at", { ascending: false }).limit(30);
  return NextResponse.json({ customer, orders: orders ?? [] });
}
