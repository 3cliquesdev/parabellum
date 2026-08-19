import { timingSafeEqual } from "crypto";

export type CustomerPayload = {
  external_id: string;
  nome?: string;
  email?: string;
  cpf?: string;
  cnpj?: string;
};

export type ExternalDataPayload = {
  tenant_id: string;
  event: "customer.wallet.updated" | "order.updated" | "inventory.updated";
  occurred_at?: string;
  customer?: CustomerPayload;
  wallet?: { balance: number; currency?: string };
  order?: {
    id: string;
    status: string;
    total?: number;
    currency?: string;
    created_at?: string;
    items: Array<{ sku: string; name?: string; quantity?: number; unit_price?: number }>;
  };
  inventory?: { sku: string; name?: string; available: number; reserved?: number };
};

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function hasExternalDataSecret(provided: string | null, envName: "CUSTOMER_DATA_WEBHOOK_SECRET" | "CUSTOMER_DATA_QUERY_SECRET") {
  const expected = process.env[envName]?.trim();
  return Boolean(expected && provided && safeEqual(provided, expected));
}

export function normalizeDigits(value: unknown) {
  return typeof value === "string" ? value.replace(/\D/g, "") || null : null;
}

export function normalizeEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function isExternalDataPayload(value: unknown): value is ExternalDataPayload {
  const body = value as Partial<ExternalDataPayload> | null;
  if (!body || typeof body !== "object" || typeof body.tenant_id !== "string") return false;
  if (body.event === "customer.wallet.updated") return Boolean(body.customer?.external_id && typeof body.wallet?.balance === "number");
  if (body.event === "order.updated") return Boolean(body.customer?.external_id && body.order?.id && body.order?.status && Array.isArray(body.order.items));
  if (body.event === "inventory.updated") return Boolean(body.inventory?.sku && typeof body.inventory.available === "number");
  return false;
}
