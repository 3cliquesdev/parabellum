import { NextRequest, NextResponse } from "next/server";
import { isInternalRequest } from "@/lib/security/internal-auth";
import { assertTenantAdmin, assertTenantMember, createAdminClient, type AdminClient } from "@/lib/auth/guard";

type Ok = { ok: true; admin: AdminClient; userId?: string };
type Fail = { ok: false; response: NextResponse };

/**
 * Autoriza chamadas de automacoes externas (ex: n8n) via header x-internal-key,
 * ou usuarios logados que sejam membros do tenant. Usado por rotas que servem
 * como "ferramentas" para o agente de IA (ex: criar/atualizar ticket).
 */
export async function resolveInternalOrTenantAuth(
  request: NextRequest,
  tenantId: string | null | undefined,
): Promise<Ok | Fail> {
  if (isInternalRequest(request)) {
    return { ok: true, admin: createAdminClient() };
  }

  const result = await assertTenantMember(tenantId);
  if (!result.ok) return result;
  return { ok: true, admin: result.admin, userId: result.user.id };
}

/**
 * Versao para operacoes administrativas. Automacoes internas continuam
 * autorizadas pelo segredo interno; usuarios humanos precisam ser owner ou
 * gerente do workspace.
 */
export async function resolveInternalOrTenantAdmin(
  request: NextRequest,
  tenantId: string | null | undefined,
): Promise<Ok | Fail> {
  if (isInternalRequest(request)) {
    return { ok: true, admin: createAdminClient() };
  }

  const result = await assertTenantAdmin(tenantId);
  if (!result.ok) return result;
  return { ok: true, admin: result.admin, userId: result.user.id };
}
