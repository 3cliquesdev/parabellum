import type { EmailTheme } from "@/types/database";

export type InviteEmailBranding = {
  nome: string;
  logoUrl?: string;
  corPrimaria: string;
  whiteLabel: boolean;
  emailTheme: EmailTheme;
};

export type InviteEmailPalette = {
  theme: EmailTheme;
  metaColorScheme: "dark" | "light";
  pageBg: string;
  pageWrapBg: string;
  cardBg: string;
  cardBorder: string;
  divider: string;
  heading: string;
  bodyText: string;
  mutedText: string;
  faintText: string;
  pillBg: string;
  pillBorder: string;
  pillText: string;
  featureBg: string;
  featureBorder: string;
  ctaText: string;
  footerText: string;
  poweredByText: string;
  shadow: string;
  brandWordmark: string;
};

export function getInviteEmailPalette(theme: EmailTheme): InviteEmailPalette {
  if (theme === "light") {
    return {
      theme,
      metaColorScheme: "light",
      pageBg: "#EFF4F8",
      pageWrapBg: "#F5F8FC",
      cardBg: "#FFFFFF",
      cardBorder: "#D7E1EB",
      divider: "#E4ECF3",
      heading: "#10213A",
      bodyText: "#334155",
      mutedText: "#64748B",
      faintText: "#8A98AA",
      pillBg: "#F2F6FA",
      pillBorder: "#D9E2EC",
      pillText: "#6B7C93",
      featureBg: "#F7FAFD",
      featureBorder: "#DEE7F0",
      ctaText: "#06120A",
      footerText: "#77869A",
      poweredByText: "#8A98AA",
      shadow: "0 18px 48px rgba(15,23,42,0.08)",
      brandWordmark: "#10213A",
    };
  }

  return {
    theme,
    metaColorScheme: "dark",
    pageBg: "#060606",
    pageWrapBg: "#060606",
    cardBg: "#0F0F0F",
    cardBorder: "rgba(255,255,255,0.07)",
    divider: "rgba(255,255,255,0.05)",
    heading: "#FFFFFF",
    bodyText: "rgba(255,255,255,0.88)",
    mutedText: "rgba(147,157,164,0.75)",
    faintText: "rgba(147,157,164,0.6)",
    pillBg: "rgba(255,255,255,0.04)",
    pillBorder: "rgba(255,255,255,0.08)",
    pillText: "rgba(147,157,164,0.6)",
    featureBg: "rgba(255,255,255,0.02)",
    featureBorder: "rgba(255,255,255,0.055)",
    ctaText: "#050505",
    footerText: "rgba(147,157,164,0.3)",
    poweredByText: "rgba(147,157,164,0.25)",
    shadow: "none",
    brandWordmark: "#FFFFFF",
  };
}

export function getInviteEmailFeatures(role: string): string[] {
  if (role === "gerente") {
    return [
      "Acesso completo ao pipeline, leads e relatorios",
      "Gestao de equipe e configuracoes do workspace",
      "Inbox de WhatsApp e automacoes com IA",
    ];
  }
  if (role === "atendente") {
    return [
      "Inbox de WhatsApp e conversas com clientes",
      "Registro de atividades e atendimentos",
      "Colaboracao em tempo real com seus colegas",
    ];
  }

  return [
    "Acesso ao pipeline de vendas e leads",
    "Inbox de WhatsApp compartilhado com a equipe",
    "Colaboracao em tempo real com seus colegas",
  ];
}

export function renderInviteEmailHtml({
  tenantName,
  inviteUrl,
  role,
  inviterEmail,
  branding,
  siteUrl,
}: {
  tenantName: string;
  inviteUrl: string;
  role: string;
  inviterEmail: string;
  branding: InviteEmailBranding;
  siteUrl: string;
}): string {
  const cor = branding.corPrimaria;
  const ROLE_LABELS: Record<string, string> = { owner: "Dono", gerente: "Gerente", vendedor: "Vendedor", atendente: "Atendente" };
  const roleLabel = ROLE_LABELS[role] ?? role;
  const initials = inviterEmail.split("@")[0].slice(0, 2).toUpperCase();
  const palette = getInviteEmailPalette(branding.emailTheme);
  const features = getInviteEmailFeatures(role);

  const headerBrand = branding.logoUrl
    ? `<img src="${branding.logoUrl}" height="28" style="display:block;max-width:140px;border:0;" alt="${branding.nome}" />`
    : `<table cellpadding="0" cellspacing="0" role="presentation"><tr>
        <td style="background:${cor};width:26px;height:26px;border-radius:7px;text-align:center;vertical-align:middle;font-size:0;">
          <span style="font-size:13px;line-height:26px;color:#0a0a0a;font-weight:900;display:block;">&#9650;</span>
        </td>
        <td style="padding-left:9px;font-size:14px;font-weight:700;color:${palette.brandWordmark};font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;letter-spacing:-0.01em;vertical-align:middle;">${branding.nome}</td>
      </tr></table>`;

  const poweredBy = branding.whiteLabel
    ? ""
    : `
    <p style="margin:12px 0 0;font-size:11px;color:${palette.poweredByText};font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
      Enviado via <a href="${siteUrl}" style="color:${palette.poweredByText};text-decoration:none;">3Cliques CRM</a> &middot; O CRM de agencias digitais
    </p>`;

  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="${palette.metaColorScheme}">
  <meta name="supported-color-schemes" content="${palette.metaColorScheme}">
  <title>Convite para ${tenantName}</title>
  <style>
    @media only screen and (max-width:600px){
      .card{width:100%!important;border-radius:0!important;}
      .pad{padding-left:24px!important;padding-right:24px!important;}
      .btn-td{display:block!important;width:100%!important;text-align:center!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${palette.pageBg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${palette.pageWrapBg};">
<tr><td align="center" style="padding:48px 16px 64px;">

  <table class="card" width="560" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${palette.cardBg};border-radius:20px;border:1px solid ${palette.cardBorder};overflow:hidden;box-shadow:${palette.shadow};">

    <tr>
      <td height="2" style="background:linear-gradient(90deg,${cor} 0%,${cor}60 60%,transparent 100%);font-size:0;line-height:0;">&nbsp;</td>
    </tr>

    <tr>
      <td class="pad" style="padding:28px 40px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="vertical-align:middle;">${headerBrand}</td>
            <td align="right" style="vertical-align:middle;">
              <span style="display:inline-block;background:${palette.pillBg};border:1px solid ${palette.pillBorder};border-radius:20px;padding:4px 10px;font-size:11px;font-weight:600;color:${palette.pillText};font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;letter-spacing:0.02em;">Convite de equipe</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr><td style="padding:0 40px;font-size:0;line-height:0;"><div style="height:1px;background:${palette.divider};">&nbsp;</div></td></tr>

    <tr>
      <td class="pad" style="padding:36px 40px 32px;">
        <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
          <tr>
            <td style="width:38px;height:38px;background:${cor}1a;border:1px solid ${cor}35;border-radius:50%;text-align:center;vertical-align:middle;">
              <span style="font-size:13px;font-weight:700;color:${cor};font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;display:block;line-height:36px;">${initials}</span>
            </td>
            <td style="padding-left:11px;vertical-align:middle;">
              <p style="margin:0;font-size:13px;font-weight:600;color:${palette.bodyText};font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;line-height:1.3;">${inviterEmail}</p>
              <p style="margin:2px 0 0;font-size:12px;color:${palette.faintText};font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">convidou voce para colaborar</p>
            </td>
          </tr>
        </table>

        <h1 style="margin:0 0 10px;font-size:30px;font-weight:800;color:${palette.heading};letter-spacing:-0.04em;line-height:1.15;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
          Voce foi convidado<br>para <span style="color:${cor};">${tenantName}</span>
        </h1>

        <p style="margin:0 0 28px;font-size:14px;color:${palette.mutedText};line-height:1.65;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
          Voce foi adicionado como&nbsp;<span style="display:inline-block;background:${cor}18;border:1px solid ${cor}30;color:${cor};font-size:11px;font-weight:700;padding:2px 9px;border-radius:20px;vertical-align:middle;letter-spacing:0.03em;">${roleLabel}</span>&nbsp;neste workspace. Aceite o convite para comecar.
        </p>

        <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;margin-bottom:28px;">
          <tr>
            <td style="background:${palette.featureBg};border:1px solid ${palette.featureBorder};border-radius:12px;padding:18px 20px;">
              ${features.map((feature, index) => `
              <table cellpadding="0" cellspacing="0" role="presentation" style="${index < features.length - 1 ? "margin-bottom:12px;" : ""}width:100%;">
                <tr>
                  <td style="width:18px;vertical-align:top;padding-top:4px;">
                    <div style="width:5px;height:5px;background:${cor};border-radius:50%;margin-top:2px;"></div>
                  </td>
                  <td style="font-size:13px;color:${palette.bodyText};font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;line-height:1.5;">${feature}</td>
                </tr>
              </table>`).join("")}
            </td>
          </tr>
        </table>

        <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;margin-bottom:14px;">
          <tr>
            <td class="btn-td" style="background:${cor};border-radius:12px;text-align:center;">
              <a href="${inviteUrl}"
                style="display:block;padding:15px 32px;color:${palette.ctaText};font-size:15px;font-weight:800;text-decoration:none;letter-spacing:-0.02em;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
                Aceitar convite e entrar &rarr;
              </a>
            </td>
          </tr>
        </table>

        <p style="margin:0;font-size:11px;color:${palette.faintText};text-align:center;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
          Expira em 7 dias &middot; Seguro e criptografado
        </p>

      </td>
    </tr>

    <tr><td style="padding:0 40px;font-size:0;line-height:0;"><div style="height:1px;background:${palette.divider};">&nbsp;</div></td></tr>

    <tr>
      <td class="pad" style="padding:22px 40px 28px;">
        <p style="margin:0;font-size:11px;color:${palette.footerText};line-height:1.65;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
          Voce recebeu este email porque <span style="color:${palette.mutedText};">${inviterEmail}</span> enviou
          um convite para ${tenantName}. Se nao esperava este convite, ignore este email com seguranca.
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
        <p style="margin:0;font-size:11px;color:${palette.poweredByText};font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;line-height:1.6;">
          Problemas com o botao?
          <a href="${inviteUrl}" style="color:${palette.poweredByText};word-break:break-all;text-decoration:underline;">${inviteUrl}</a>
        </p>
      </td>
    </tr>
  </table>

</td></tr>
</table>

</body>
</html>`;
}
