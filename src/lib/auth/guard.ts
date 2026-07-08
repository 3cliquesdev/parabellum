import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LooseDatabase } from "@/types/database";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AdminClient = SupabaseClient<LooseDatabase>;
type Admin = AdminClient;

/**
 * Cliente com service_role — IGNORA RLS. Use somente atrás de uma checagem
 * de autorização (assertTenantMember / assertAgencyMember / assertSuperAdmin).
 */
export function createAdminClient(): Admin {
  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  ) as unknown as Admin;
}

/** Cliente anon (RLS ativo) só para resolver a sessão a partir dos cookies. */
async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
}

/** Usuário autenticado da sessão atual, ou null. */
export async function getSessionUser(): Promise<User | null> {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const forbidden = (msg = "Forbidden") => NextResponse.json({ error: msg }, { status: 403 });

type Ok<T> = { ok: true; response?: never } & T;
type Fail = { ok: false; response: NextResponse };
type Guard<T> = Ok<T> | Fail;

/**
 * Exige um usuário logado que seja membro de `tenantId` (tabela tenant_members).
 * Retorna também um admin client pronto para uso pós-autorização.
 */
export async function assertTenantMember(
  tenantId: string | null | undefined,
): Promise<Guard<{ user: User; role: string; admin: Admin }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, response: unauthorized() };
  if (!tenantId) return { ok: false, response: NextResponse.json({ error: "tenant_id required" }, { status: 400 }) };

  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  const row = data as { role?: string } | null;
  if (!row) return { ok: false, response: forbidden() };

  return { ok: true, user, role: row.role ?? "member", admin };
}

/** Igual a assertTenantMember, mas exige role owner/admin no tenant. */
export async function assertTenantAdmin(
  tenantId: string | null | undefined,
): Promise<Guard<{ user: User; role: string; admin: Admin }>> {
  const result = await assertTenantMember(tenantId);
  if (!result.ok) return result;
  if (!["owner", "admin"].includes(result.role)) {
    return { ok: false, response: forbidden("Requer permissao de admin") };
  }
  return result;
}

/**
 * Exige um usuário logado que pertença a uma agência (agency_users).
 * Se `tenantId` for informado, também valida que o tenant pertence à agência do usuário.
 * Se `requireAdmin` for true, exige role owner/admin na agência.
 */
export async function assertAgencyMember(
  opts: { tenantId?: string | null; agencyId?: string | null; requireAdmin?: boolean } = {},
): Promise<Guard<{ user: User; agencyId: string; role: string; admin: Admin }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, response: unauthorized() };

  const admin = createAdminClient();
  const { data } = await admin
    .from("agency_users")
    .select("agency_id, role")
    .eq("user_id", user.id)
    .limit(1);

  const memberships = (data ?? []) as { agency_id: string; role: string }[];
  if (memberships.length === 0) return { ok: false, response: forbidden("Sem permissao") };

  const membership = memberships[0];
  if (opts.requireAdmin && !["owner", "admin"].includes(membership.role)) {
    return { ok: false, response: forbidden("Sem permissao") };
  }

  if (opts.agencyId && opts.agencyId !== membership.agency_id) {
    return { ok: false, response: forbidden("Recurso nao pertence a sua agencia") };
  }

  if (opts.tenantId) {
    const { data: tenant } = await admin
      .from("tenants")
      .select("agency_id")
      .eq("id", opts.tenantId)
      .maybeSingle();
    const tenantRow = tenant as { agency_id?: string | null } | null;
    if (!tenantRow || tenantRow.agency_id !== membership.agency_id) {
      return { ok: false, response: forbidden("Tenant nao pertence a sua agencia") };
    }
  }

  return { ok: true, user, agencyId: membership.agency_id, role: membership.role, admin };
}

/** Exige que o usuário logado conste em super_admins (por email). */
export async function assertSuperAdmin(): Promise<Guard<{ user: User; admin: Admin }>> {
  const user = await getSessionUser();
  if (!user?.email) return { ok: false, response: unauthorized() };

  const admin = createAdminClient();
  const { data } = await admin
    .from("super_admins")
    .select("id")
    .eq("email", user.email)
    .maybeSingle();

  if (!data) return { ok: false, response: forbidden() };
  return { ok: true, user, admin };
}
