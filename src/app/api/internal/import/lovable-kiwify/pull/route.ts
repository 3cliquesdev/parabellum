import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isInternalRequest } from "@/lib/security/internal-auth";

export const maxDuration = 60;

type LegacySale = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  phone_raw?: string | null;
  document?: string | null;
  address?: Record<string, string | null> | null;
  product?: { product_id?: string | null; product_name?: string | null; plan_name?: string | null } | null;
  sale_id?: string | null;
  order_id?: string | null;
  order_ref?: string | null;
  paid_at?: string | null;
  event_created_at?: string | null;
  amount?: number | null;
  amount_cents?: number | null;
  currency?: string | null;
  source?: { event_id?: string | null } | null;
};

type Customer = {
  email: string;
  name?: string | null;
  phone?: string | null;
  cpf?: string | null;
  address?: { street?: string | null; number?: string | null; complement?: string | null; neighborhood?: string | null; city?: string | null; state?: string | null; zipcode?: string | null };
  sales: Array<{ legacy_event_id: string; order_id?: string | null; paid_at?: string | null; product_id?: string | null; product_name?: string | null; value?: number | null; product_type?: "curso" | "assinatura" | "outro" }>;
};

function authorized(request: NextRequest) {
  if (isInternalRequest(request)) return true;
  const received = request.headers.get("x-lovable-import-key");
  if (!received) return false;
  return [process.env.LOVABLE_KIWIFY_IMPORT_SECRET, process.env.LOVABLE_KIWIFY_SOURCE_KEY]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .some((expected) => {
      const a = Buffer.from(expected);
      const b = Buffer.from(received);
      return a.length === b.length && timingSafeEqual(a, b);
    });
}

function money(row: LegacySale) {
  if (typeof row.amount === "number") return row.amount;
  if (typeof row.amount_cents === "number") return row.amount_cents / 100;
  return 0;
}

function mapRows(rows: LegacySale[]) {
  const customers = new Map<string, Customer>();
  for (const row of rows) {
    const email = row.email?.trim().toLowerCase();
    const legacyEventId = row.source?.event_id ?? row.sale_id ?? row.order_id ?? row.order_ref;
    if (!email || !legacyEventId) continue;
    let customer = customers.get(email);
    if (!customer) {
      const address = row.address ?? {};
      customer = {
        email,
        name: row.name ?? null,
        phone: row.phone ?? row.phone_raw ?? null,
        cpf: row.document ?? null,
        address: {
          street: address.street ?? null, number: address.number ?? null, complement: address.complement ?? null,
          neighborhood: address.neighborhood ?? null, city: address.city ?? null, state: address.state ?? null,
          zipcode: address.zip_code ?? null,
        },
        sales: [],
      };
      customers.set(email, customer);
    }
    const plan = row.product?.plan_name ?? "";
    customer.sales.push({
      legacy_event_id: String(legacyEventId),
      order_id: row.order_id ?? row.order_ref ?? null,
      paid_at: row.paid_at ?? row.event_created_at ?? null,
      product_id: row.product?.product_id ?? null,
      product_name: (row.product?.product_name ?? plan) || "Produto Kiwify",
      value: money(row),
      product_type: /assinatura|mensal|anual|recorr/i.test(plan) ? "assinatura" : "curso",
    });
  }
  return [...customers.values()];
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { tenant_id?: string; cursor?: string | null; limit?: number };
  if (!body.tenant_id) return NextResponse.json({ error: "tenant_id obrigatorio" }, { status: 400 });

  const sourceUrl = process.env.LOVABLE_KIWIFY_SOURCE_URL?.trim();
  const sourceKey = process.env.LOVABLE_KIWIFY_SOURCE_KEY?.trim();
  const importKey = process.env.LOVABLE_KIWIFY_IMPORT_SECRET?.trim();
  if (!sourceUrl || !sourceKey || !importKey) return NextResponse.json({ error: "Fonte de migracao Kiwify nao configurada" }, { status: 500 });

  const source = new URL(sourceUrl);
  source.searchParams.set("limit", String(Math.min(Math.max(body.limit ?? 250, 1), 1000)));
  if (body.cursor) source.searchParams.set("cursor", body.cursor);
  const legacyResponse = await fetch(source, { headers: { "x-api-key": sourceKey }, cache: "no-store" });
  if (!legacyResponse.ok) return NextResponse.json({ error: `Fonte Kiwify respondeu HTTP ${legacyResponse.status}` }, { status: 502 });
  const legacy = await legacyResponse.json() as { data?: LegacySale[]; next_cursor?: string | null; has_more?: boolean };
  const customers = mapRows(legacy.data ?? []);

  const totals = { customers: 0, salesImported: 0, salesAlreadyImported: 0, skipped: 0, errors: 0 };
  const chunks = Array.from({ length: Math.ceil(customers.length / 50) }, (_, index) => customers.slice(index * 50, index * 50 + 50));
  for (let index = 0; index < chunks.length; index += 5) {
    const results = await Promise.all(chunks.slice(index, index + 5).map(async (customersChunk) => {
      const response = await fetch(new URL("/api/internal/import/lovable-kiwify", request.url), {
        method: "POST",
        headers: { "content-type": "application/json", "x-lovable-import-key": importKey },
        body: JSON.stringify({ tenant_id: body.tenant_id, customers: customersChunk }),
      });
      const result = await response.json().catch(() => ({})) as Partial<typeof totals> & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Falha ao importar lote");
      return result;
    }));
    for (const result of results) for (const key of Object.keys(totals) as Array<keyof typeof totals>) totals[key] += Number(result[key] ?? 0);
  }

  return NextResponse.json({ ok: totals.errors === 0, ...totals, received: (legacy.data ?? []).length, next_cursor: legacy.next_cursor ?? null, has_more: Boolean(legacy.has_more) });
}
