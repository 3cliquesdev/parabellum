import { NextResponse } from "next/server";
import { createAdminClient, getSessionUser } from "@/lib/auth/guard";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: memberships } = await admin
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);
  const membership = (memberships ?? [])[0] as { tenant_id?: string; role?: string } | undefined;
  const tenantId = membership?.tenant_id ?? null;

  if (!tenantId) {
    return NextResponse.json({ error: "Nenhum workspace ativo" }, { status: 404 });
  }

  const { data: tenant } = await admin
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .maybeSingle();
  if (!tenant) return NextResponse.json({ error: "Workspace nao encontrado" }, { status: 404 });

  return NextResponse.json({ tenant, role: membership?.role ?? "vendedor" });
}
