import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";
import { isUuid } from "@/lib/security/validate";
import { sendOtpEmail } from "@/lib/security/otp";

interface SendOtpBody {
  tenant_id?: string;
  lead_id?: string;
  conversa_id?: string;
}

function digits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function samePhone(left: string, right: string) {
  const a = digits(left).replace(/^55/, "");
  const b = digits(right).replace(/^55/, "");
  return Boolean(a && b && a === b);
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
    .select("email, whatsapp, cpf")
    .eq("id", lead_id)
    .eq("tenant_id", tenant_id)
    .maybeSingle();

  if (leadError) return NextResponse.json({ error: leadError.message }, { status: 500 });
  const leadRow = lead as { email?: string | null; whatsapp?: string | null; cpf?: string | null } | null;
  const email = leadRow?.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ found: false, error: "Lead nao tem e-mail cadastrado para enviar o codigo" }, { status: 404 });
  }

  const { data: paidSales, error: salesError } = await auth.admin
    .from("vendas")
    .select("buyer_phone_normalized, buyer_cpf_normalized")
    .eq("tenant_id", tenant_id)
    .in("origem", ["kiwify", "kiwify_lovable"])
    .eq("status", "pago")
    .eq("buyer_email_normalized", email)
    .limit(20);
  if (salesError) return NextResponse.json({ error: salesError.message }, { status: 500 });

  const hasPaidIdentityMatch = ((paidSales ?? []) as Array<{ buyer_phone_normalized?: string | null; buyer_cpf_normalized?: string | null }>).some((sale) =>
    samePhone(sale.buyer_phone_normalized ?? "", leadRow?.whatsapp ?? "") ||
    (digits(sale.buyer_cpf_normalized) !== "" && digits(sale.buyer_cpf_normalized) === digits(leadRow?.cpf)),
  );
  if (!hasPaidIdentityMatch) {
    return NextResponse.json({ enviado: false, error: "Identidade financeira nao confirmada por compra Kiwify paga" }, { status: 403 });
  }

  const result = await sendOtpEmail(auth.admin, { tenantId: tenant_id, leadId: lead_id, conversaId: conversa_id, email });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });

  const masked = email.replace(/^(.).*(@.*)$/, (_m, first, domain) => `${first}***${domain}`);
  return NextResponse.json({ enviado: true, email_mascarado: masked });
}
