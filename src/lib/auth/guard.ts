import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LooseDatabase } from "@/types/database";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AdminClient = SupabaseClient<LooseDatabase>;
type Admin = AdminClient;

/**
 * Cliente com service_role — IGNORA RLS. Use somente atrás de uma checagem
 * de autorização (assertTenantMember / assertTenantAdmin).
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

  return { ok: true, user, role: row.role ?? "vendedor", admin };
}

/** Igual a assertTenantMember, mas exige role owner/gerente no tenant. */
export async function assertTenantAdmin(
  tenantId: string | null | undefined,
): Promise<Guard<{ user: User; role: string; admin: Admin }>> {
  const result = await assertTenantMember(tenantId);
  if (!result.ok) return result;
  if (!["owner", "gerente"].includes(result.role)) {
    return { ok: false, response: forbidden("Requer permissao de gerente") };
  }
  return result;
}

/**
 * Igual a assertTenantMember, mas exige acesso liberado a uma integracao
 * especifica (ex: "whatsapp"). Nao e por cargo - o dono sempre tem acesso a
 * tudo, qualquer outra pessoa (independente do cargo) so passa se tiver uma
 * linha em integracao_acessos com acesso_full=true pra essa integracao.
 * Cada integracao nova (email, etc) so precisa passar sua propria chave
 * aqui - nao precisa de migration nem de mexer nesta funcao.
 */
export async function assertIntegrationAccess(
  tenantId: string | null | undefined,
  integracao: string,
): Promise<Guard<{ user: User; role: string; admin: Admin }>> {
  const result = await assertTenantMember(tenantId);
  if (!result.ok) return result;
  if (result.role === "owner") return result;

  const { data } = await result.admin
    .from("integracao_acessos")
    .select("acesso_full")
    .eq("tenant_id", tenantId as string)
    .eq("user_id", result.user.id)
    .eq("integracao", integracao)
    .maybeSingle();

  const row = data as { acesso_full?: boolean } | null;
  if (!row?.acesso_full) {
    return { ok: false, response: forbidden("Sem acesso a esta integracao") };
  }
  return result;
}
