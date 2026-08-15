import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";
import { isUuid } from "@/lib/security/validate";
import { verifyOtpCode } from "@/lib/security/otp";

interface VerifyOtpBody {
  tenant_id?: string;
  conversa_id?: string;
  codigo?: string;
}

// Valida o codigo enviado por e-mail e, se correto, marca a conversa como
// verificada financeiramente (conversas.financeiro_verificado_em).
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as VerifyOtpBody;
  const { tenant_id, conversa_id, codigo } = body;
  if (!isUuid(tenant_id) || !isUuid(conversa_id) || !codigo) {
    return NextResponse.json({ error: "tenant_id, conversa_id (UUIDs validos) e codigo sao obrigatorios" }, { status: 400 });
  }

  const auth = await resolveInternalOrTenantAuth(request, tenant_id);
  if (!auth.ok) return auth.response;

  const result = await verifyOtpCode(auth.admin, { tenantId: tenant_id, conversaId: conversa_id, code: codigo });
  if (!result.ok) return NextResponse.json({ verificado: false, error: result.error }, { status: 400 });

  return NextResponse.json({ verificado: true });
}
