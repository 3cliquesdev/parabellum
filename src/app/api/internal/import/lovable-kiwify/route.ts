import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { LooseDatabase } from "@/types/database";
import { resolveOrLinkLead } from "@/lib/inbox/service";
import { reconcileLeadWithKiwify } from "@/lib/kiwify-reconciliation";

export const maxDuration = 60;

type SaleInput = {
  legacy_event_id: string;
  order_id?: string | null;
  paid_at?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  value?: number | null;
  product_type?: "curso" | "assinatura" | "outro" | null;
};

type CustomerInput = {
  email: string;
  name?: string | null;
  phone?: string | null;
  cpf?: string | null;
  address?: {
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    zipcode?: string | null;
  } | null;
  sales: SaleInput[];
};

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function authorized(request: NextRequest) {
  const expected = process.env.LOVABLE_KIWIFY_IMPORT_SECRET?.trim();
  const received = request.headers.get("x-lovable-import-key");
  return Boolean(expected && expected.length >= 32 && received && safeEqual(received, expected));
}

function normalizedEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizedPhone(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (!digits) return null;
  return digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
}

function normalizedCpf(value: string | null | undefined) {
  return value?.replace(/\D/g, "") || null;
}

function adminClient() {
  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const body = await request.json().catch(() => null) as { tenant_id?: string; customers?: CustomerInput[] } | null;
  const tenantId = body?.tenant_id?.trim();
  const customers = body?.customers;
  if (!tenantId || !Array.isArray(customers) || customers.length === 0 || customers.length > 50) {
    return NextResponse.json({ error: "Informe tenant_id e entre 1 e 50 clientes" }, { status: 400 });
  }
  if (customers.reduce((total, customer) => total + (Array.isArray(customer.sales) ? customer.sales.length : 0), 0) > 250) {
    return NextResponse.json({ error: "O lote suporta no maximo 250 compras" }, { status: 400 });
  }

  const admin = adminClient();
  const result = { customers: 0, salesImported: 0, salesAlreadyImported: 0, skipped: 0, errors: 0 };

  const importCustomer = async (customer: CustomerInput) => {
    const email = normalizedEmail(customer.email);
    const sales = Array.isArray(customer.sales) ? customer.sales : [];
    if (!email || sales.length === 0) { result.skipped += 1; return; }

    try {
      const lead = await resolveOrLinkLead(
        admin,
        tenantId,
        { canal: "email", value: email },
        {
          name: customer.name ?? null,
          origem: "kiwify_lovable",
          identities: customer.phone ? [{ canal: "whatsapp", value: customer.phone }] : [],
          extra: {
            cpf: customer.cpf ?? null,
            enderecoRua: customer.address?.street ?? null,
            enderecoNumero: customer.address?.number ?? null,
            enderecoComplemento: customer.address?.complement ?? null,
            enderecoBairro: customer.address?.neighborhood ?? null,
            enderecoCidade: customer.address?.city ?? null,
            enderecoEstado: customer.address?.state ?? null,
            enderecoCep: customer.address?.zipcode ?? null,
          },
        },
        { reconcile: false },
      );

      for (const sale of sales) {
        if (!sale.legacy_event_id?.trim()) { result.skipped += 1; continue; }
        const externalId = `lovable:${sale.legacy_event_id.trim()}`;
        const { data: existing } = await admin.from("vendas").select("id").eq("tenant_id", tenantId)
          .eq("origem", "kiwify_lovable").eq("external_id", externalId).maybeSingle();
        if (existing) { result.salesAlreadyImported += 1; continue; }

        const rawPayload = {
          source: "lovable_legacy_kiwify",
          legacy_event_id: sale.legacy_event_id,
          order_id: sale.order_id ?? null,
          Customer: {
            full_name: customer.name ?? null, email, mobile: customer.phone ?? null, CPF: customer.cpf ?? null,
            street: customer.address?.street ?? null, number: customer.address?.number ?? null,
            complement: customer.address?.complement ?? null, neighborhood: customer.address?.neighborhood ?? null,
            city: customer.address?.city ?? null, state: customer.address?.state ?? null, zipcode: customer.address?.zipcode ?? null,
          },
          Product: { product_id: sale.product_id ?? null, product_name: sale.product_name ?? "Produto Kiwify" },
        };
        const { data: inserted, error } = await admin.from("vendas").insert({
          tenant_id: tenantId,
          // A reconciliacao abaixo e quem vincula todas as compras desse e-mail
          // de uma vez, inclusive para registrar cada produto na timeline.
          lead_id: null,
          produto_nome: sale.product_name?.trim() || "Produto Kiwify",
          valor: Number.isFinite(sale.value) ? sale.value : 0,
          status: "pago",
          tipo_produto: sale.product_type === "assinatura" ? "assinatura" : sale.product_type === "outro" ? "outro" : "curso",
          origem: "kiwify_lovable",
          external_id: externalId,
          buyer_phone_normalized: normalizedPhone(customer.phone),
          buyer_email_normalized: email,
          buyer_cpf_normalized: normalizedCpf(customer.cpf),
          raw_payload: rawPayload,
          paid_at: sale.paid_at ?? null,
        }).select("id").single();
        if (error) throw error;
        void inserted;
        result.salesImported += 1;
      }

      // A regra comercial e por e-mail: uma compra paga torna o cadastro cliente.
      // A reconciliacao preenche apenas dados ausentes, registra timeline e fecha o negocio sem criar duplicatas.
      await reconcileLeadWithKiwify(admin, tenantId, lead.id);
      result.customers += 1;
    } catch (error) {
      console.error("lovable kiwify import: customer failed", { email, error });
      result.errors += 1;
    }
  };

  // Cada e-mail e independente. Concorrencia limitada reduz a duracao do lote
  // sem criar corrida entre identidades do mesmo cliente.
  for (let index = 0; index < customers.length; index += 25) {
    await Promise.all(customers.slice(index, index + 25).map(importCustomer));
  }

  return NextResponse.json({ ok: result.errors === 0, ...result });
}
