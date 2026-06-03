import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sendMail, type AgencySmtp } from "@/lib/mailer";
import type { LooseDatabase } from "@/types/database";

const ROLE_LABEL: Record<string, string> = { admin: "Administrador", member: "Membro" };
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liberty-crm-six.vercel.app";

type EmailBranding = {
  nome: string;
  logoUrl?: string;
  corPrimaria: string;
  whiteLabel: boolean;
};

interface InviteRequestBody {
  email?: string;
  role?: string;
  tenant_id?: string;
}

interface TenantMemberRoleRow {
  role: string;
}

interface TenantBrandingRow {
  name: string | null;
  nome_fantasia: string | null;
  logo_url: string | null;
  cor_primaria: string | null;
  white_label: boolean | null;
  agency_id: string | null;
}

interface AgencySmtpRow extends AgencySmtp {
  display_name?: string | null;
  name?: string | null;
}

interface InviteTokenRow {
  token: string;
}

function inviteEmailHtml(
  tenantName: string,
  inviteUrl: string,
  role: string,
  inviterEmail: string,
  branding: EmailBranding
) {
  const cor = branding.corPrimaria;
  const roleLabel = ROLE_LABEL[role] ?? role;
  const initials = inviterEmail.split("@")[0].slice(0, 2).toUpperCase();

  const headerBrand = branding.logoUrl
    ? `<img src="${branding.logoUrl}" height="28" style="display:block;max-width:140px;border:0;" alt="${branding.nome}" />`
    : `<table cellpadding="0" cellspacing="0" role="presentation"><tr>
        <td style="background:${cor};width:26px;height:26px;border-radius:7px;text-align:center;vertical-align:middle;font-size:0;">
          <span style="font-size:13px;line-height:26px;color:#0a0a0a;font-weight:900;display:block;">&#9650;</span>
        </td>
        <td style="padding-left:9px;font-size:14px;font-weight:700;color:#ffffff;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;letter-spacing:-0.01em;vertical-align:middle;">${branding.nome}</td>
      </tr></table>`;

  const features = role === "admin"
    ? [
        "Acesso completo ao pipeline, leads e relatorios",
        "Gestao de equipe e configuracoes do workspace",
        "Inbox de WhatsApp e automacoes com IA",
      ]
    : [
        "Acesso ao pipeline de vendas e leads",
        "Inbox de WhatsApp compartilhado com a equipe",
        "Colaboracao em tempo real com seus colegas",
      ];

  const poweredBy = branding.whiteLabel
    ? ""
    : `
    <p style="margin:12px 0 0;font-size:11px;color:rgba(147,157,164,0.25);font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
      Enviado via <a href="https://liberty-crm-six.vercel.app" style="color:rgba(147,157,164,0.35);text-decoration:none;">Liberty CRM</a> &middot; O CRM de agencias digitais
    </p>`;

  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Convite para ${tenantName}</title>
  <style>
    @media only screen and (max-width:600px){
      .card{width:100%!important;border-radius:0!important;}
      .pad{padding-left:24px!important;padding-right:24px!important;}
      .btn-td{display:block!important;width:100%!important;text-align:center!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#060606;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#060606;">
<tr><td align="center" style="padding:48px 16px 64px;">

  <table class="card" width="560" cellpadding="0" cellspacing="0" role="presentation"
    style="background:#0f0f0f;border-radius:20px;border:1px solid rgba(255,255,255,0.07);overflow:hidden;">

    <tr>
      <td height="2" style="background:linear-gradient(90deg,${cor} 0%,${cor}60 60%,transparent 100%);font-size:0;line-height:0;">&nbsp;</td>
    </tr>

    <tr>
      <td class="pad" style="padding:28px 40px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="vertical-align:middle;">${headerBrand}</td>
            <td align="right" style="vertical-align:middle;">
              <span style="display:inline-block;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:4px 10px;font-size:11px;font-weight:600;color:rgba(147,157,164,0.6);font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;letter-spacing:0.02em;">Convite de equipe</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr><td style="padding:0 40px;font-size:0;line-height:0;"><div style="height:1px;background:rgba(255,255,255,0.05);">&nbsp;</div></td></tr>

    <tr>
      <td class="pad" style="padding:36px 40px 32px;">
        <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
          <tr>
            <td style="width:38px;height:38px;background:${cor}1a;border:1px solid ${cor}35;border-radius:50%;text-align:center;vertical-align:middle;">
              <span style="font-size:13px;font-weight:700;color:${cor};font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;display:block;line-height:36px;">${initials}</span>
            </td>
            <td style="padding-left:11px;vertical-align:middle;">
              <p style="margin:0;font-size:13px;font-weight:600;color:rgba(255,255,255,0.9);font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;line-height:1.3;">${inviterEmail}</p>
              <p style="margin:2px 0 0;font-size:12px;color:rgba(147,157,164,0.6);font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">convidou voce para colaborar</p>
            </td>
          </tr>
        </table>

        <h1 style="margin:0 0 10px;font-size:30px;font-weight:800;color:#ffffff;letter-spacing:-0.04em;line-height:1.15;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
          Voce foi convidado<br>para <span style="color:${cor};">${tenantName}</span>
        </h1>

        <p style="margin:0 0 28px;font-size:14px;color:rgba(147,157,164,0.75);line-height:1.65;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
          Voce foi adicionado como&nbsp;<span style="display:inline-block;background:${cor}18;border:1px solid ${cor}30;color:${cor};font-size:11px;font-weight:700;padding:2px 9px;border-radius:20px;vertical-align:middle;letter-spacing:0.03em;">${roleLabel}</span>&nbsp;neste workspace. Aceite o convite para comecar.
        </p>

        <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;margin-bottom:28px;">
          <tr>
            <td style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.055);border-radius:12px;padding:18px 20px;">
              ${features.map((feature, index) => `
              <table cellpadding="0" cellspacing="0" role="presentation" style="${index < features.length - 1 ? "margin-bottom:12px;" : ""}width:100%;">
                <tr>
                  <td style="width:18px;vertical-align:top;padding-top:4px;">
                    <div style="width:5px;height:5px;background:${cor};border-radius:50%;margin-top:2px;"></div>
                  </td>
                  <td style="font-size:13px;color:rgba(255,255,255,0.65);font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;line-height:1.5;">${feature}</td>
                </tr>
              </table>`).join("")}
            </td>
          </tr>
        </table>

        <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;margin-bottom:14px;">
          <tr>
            <td class="btn-td" style="background:${cor};border-radius:12px;text-align:center;">
              <a href="${inviteUrl}"
                style="display:block;padding:15px 32px;color:#050505;font-size:15px;font-weight:800;text-decoration:none;letter-spacing:-0.02em;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
                Aceitar convite e entrar &rarr;
              </a>
            </td>
          </tr>
        </table>

        <p style="margin:0;font-size:11px;color:rgba(147,157,164,0.35);text-align:center;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
          Expira em 7 dias &middot; Seguro e criptografado
        </p>

      </td>
    </tr>

    <tr><td style="padding:0 40px;font-size:0;line-height:0;"><div style="height:1px;background:rgba(255,255,255,0.05);">&nbsp;</div></td></tr>

    <tr>
      <td class="pad" style="padding:22px 40px 28px;">
        <p style="margin:0;font-size:11px;color:rgba(147,157,164,0.3);line-height:1.65;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
          Voce recebeu este email porque <span style="color:rgba(147,157,164,0.5);">${inviterEmail}</span> convidou
          <span style="color:rgba(147,157,164,0.5);">${inviterEmail.split("@")[0]}</span> para ${tenantName}.
          Se nao esperava este convite, ignore este email com seguranca.
        </p>
        ${poweredBy}
      </td>
    </tr>

    <tr>
      <td height="1" style="background:linear-gradient(90deg,transparent 0%,${cor}25 50%,transparent 100%);font-size:0;line-height:0;">&nbsp;</td>
    </tr>

  </table>

  <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:20px;">
    <tr>
      <td class="pad" style="padding:0 40px;text-align:center;">
        <p style="margin:0;font-size:11px;color:rgba(147,157,164,0.25);font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;line-height:1.6;">
          Problemas com o botao?
          <a href="${inviteUrl}" style="color:rgba(147,157,164,0.4);word-break:break-all;text-decoration:underline;">${inviteUrl}</a>
        </p>
      </td>
    </tr>
  </table>

</td></tr>
</table>

</body>
</html>`;
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, role, tenant_id } = (await request.json().catch(() => ({}))) as InviteRequestBody;
  if (!email || !role || !tenant_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const admin = createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: myRole } = await admin.from("tenant_members")
    .select("role")
    .eq("tenant_id", tenant_id)
    .eq("user_id", user.id)
    .single();
  const currentRole = myRole as unknown as TenantMemberRoleRow | null;
  if (!currentRole || !["owner", "admin"].includes(currentRole.role)) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const { data: tenant } = await admin.from("tenants")
    .select("name, nome_fantasia, logo_url, cor_primaria, white_label, agency_id")
    .eq("id", tenant_id)
    .single();
  const tenantData = tenant as unknown as TenantBrandingRow | null;

  let agencySmtp: AgencySmtpRow | null = null;
  if (tenantData?.agency_id) {
    const { data: agencyData } = await admin.from("agencies")
      .select("smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_from_name, display_name, name")
      .eq("id", tenantData.agency_id)
      .single();
    agencySmtp = agencyData as unknown as AgencySmtpRow | null;
  }

  const { data: invite, error: inviteError } = await admin.from("invite_tokens").insert({
    tenant_id,
    email,
    role,
    invited_by: user.id,
  }).select("token").single();
  const inviteData = invite as unknown as InviteTokenRow | null;

  if (inviteError || !inviteData) {
    return NextResponse.json({ error: inviteError?.message ?? "Nao foi possivel gerar o convite" }, { status: 500 });
  }

  const inviteUrl = `${SITE_URL}/invite?token=${inviteData.token}`;
  const tenantName = tenantData?.nome_fantasia ?? tenantData?.name ?? "Liberty CRM";
  const branding: EmailBranding = {
    nome: tenantName,
    logoUrl: tenantData?.white_label && tenantData?.logo_url ? tenantData.logo_url : undefined,
    corPrimaria: tenantData?.cor_primaria ?? "#9aea62",
    whiteLabel: tenantData?.white_label ?? false,
  };
  const agencyDisplayName = agencySmtp?.display_name ?? agencySmtp?.name;
  const fromName = agencyDisplayName ? `${agencyDisplayName}` : `${tenantName} | Liberty CRM`;

  const emailSent = await sendMail(
    {
      to: email,
      subject: `Voce foi convidado para ${tenantName}`,
      html: inviteEmailHtml(tenantName, inviteUrl, role, user.email ?? "Alguem", branding),
      fromName,
    },
    agencySmtp ?? undefined
  );

  return NextResponse.json({
    success: true,
    invite_url: inviteUrl,
    token: inviteData.token,
    email_sent: emailSent,
  });
}
