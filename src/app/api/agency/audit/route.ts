import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// POST — registrar evento de auditoria
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agency_id, action, entity_type, entity_id, details } = await request.json();
  if (!agency_id || !action) return NextResponse.json({ error: "agency_id e action são obrigatórios" }, { status: 400 });

  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  await admin.from("agency_audit_logs").insert({
    agency_id, user_id: user.id, action,
    entity_type: entity_type ?? null,
    entity_id: entity_id ?? null,
    details: details ?? {},
    ip_address: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip"),
  });

  return NextResponse.json({ success: true });
}

// Função helper para uso interno (server-side)
export async function logAudit(params: {
  agencyId: string; userId: string; action: string;
  entityType?: string; entityId?: string; details?: Record<string, any>;
}) {
  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
  await admin.from("agency_audit_logs").insert({
    agency_id: params.agencyId,
    user_id: params.userId,
    action: params.action,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
    details: params.details ?? {},
  });
}
