import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LooseDatabase } from "@/types/database";

interface AuditLogBody {
  agency_id?: string;
  action?: string;
  entity_type?: string | null;
  entity_id?: string | null;
  details?: Record<string, unknown>;
}

interface AuditLogParams {
  agencyId: string;
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

function createAdminClient() {
  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as AuditLogBody;
  if (!body.agency_id || !body.action) {
    return NextResponse.json({ error: "agency_id e action sao obrigatorios" }, { status: 400 });
  }

  await createAdminClient().from("agency_audit_logs").insert({
    agency_id: body.agency_id,
    user_id: user.id,
    action: body.action,
    entity_type: body.entity_type ?? null,
    entity_id: body.entity_id ?? null,
    details: body.details ?? {},
    ip_address: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip"),
  });

  return NextResponse.json({ success: true });
}

export async function logAudit(params: AuditLogParams) {
  await createAdminClient().from("agency_audit_logs").insert({
    agency_id: params.agencyId,
    user_id: params.userId,
    action: params.action,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
    details: params.details ?? {},
  });
}
