import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";
import { isUuid } from "@/lib/security/validate";
import { sendOtpEmail } from "@/lib/security/otp";

interface SendOtpBody {
  tenant_id?: string;
  lead_id?: string;
  conversa_id?: string;
}

// Envia um codigo de verificacao para o e-mail cadastrado do lead. Usado antes de
// qualquer acao financeira que mexa em dinheiro de verdade (ex: saque de saldo).
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as SendOtpBody;
  const { tenant_id, lead_id, conversa_id } = body;
  if (!isUuid(tenant_id) || !isUuid(lead_id) || !isUuid(conversa_id)) {
    return NextResponse.json({ error: "tenant_id, lead_id e conversa_id (UUIDs validos) sao obrigatorios" }, { status: 400 });
  }

  const auth = await resolveInternalOrTenantAuth(request, tenant_id);
  if (!auth.ok) return auth.response;

  const { data: lead, error: leadError } = await auth.admin
    .from("leads")
    .select("email")
    .eq("id", lead_id)
    .eq("tenant_id", tenant_id)
    .maybeSingle();

  if (leadError) return NextResponse.json({ error: leadError.message }, { status: 500 });
  const email = (lead as { email?: string | null } | null)?.email;
  if (!email) {
    return NextResponse.json({ found: false, error: "Lead nao tem e-mail cadastrado para enviar o codigo" }, { status: 404 });
  }

  const result = await sendOtpEmail(auth.admin, { tenantId: tenant_id, leadId: lead_id, conversaId: conversa_id, email });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });

  const masked = email.replace(/^(.).*(@.*)$/, (_m, first, domain) => `${first}***${domain}`);
  return NextResponse.json({ enviado: true, email_mascarado: masked });
}
