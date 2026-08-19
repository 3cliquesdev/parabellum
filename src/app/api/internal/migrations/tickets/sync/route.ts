import { NextRequest, NextResponse } from "next/server";
import { assertTenantAdmin, createAdminClient } from "@/lib/auth/guard";
import { isInternalRequest } from "@/lib/security/internal-auth";
import { recordLegacyTicketSyncError, syncLegacyTickets } from "@/lib/tickets/legacy-migration";

export const maxDuration = 300;

function isCronRequest(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

function configuredTenantId(request: NextRequest, body?: { tenant_id?: string }): string | null {
  return body?.tenant_id?.trim()
    || request.nextUrl.searchParams.get("tenant_id")?.trim()
    || process.env.LEGACY_TICKETS_TENANT_ID?.trim()
    || null;
}

async function run(request: NextRequest, body?: { tenant_id?: string }) {
  const tenantId = configuredTenantId(request, body);
  if (!tenantId) return NextResponse.json({ error: "LEGACY_TICKETS_TENANT_ID nao configurado" }, { status: 503 });
  let admin = createAdminClient();
  if (!isInternalRequest(request) && !isCronRequest(request)) {
    const auth = await assertTenantAdmin(tenantId);
    if (!auth.ok) return auth.response;
    admin = auth.admin;
  }
  try {
    return NextResponse.json({ ok: true, ...(await syncLegacyTickets(admin, tenantId)) });
  } catch (error) {
    await recordLegacyTicketSyncError(admin, tenantId, error);
    console.error("legacy ticket sync failed", error);
    return NextResponse.json({ error: "Falha ao sincronizar tickets antigos" }, { status: 502 });
  }
}

export async function GET(request: NextRequest) { return run(request); }
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return run(request, body as { tenant_id?: string });
}
