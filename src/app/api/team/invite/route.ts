import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Resend } from "resend";

const ROLE_LABEL: Record<string, string> = { admin: "Administrador", member: "Membro" };
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liberty-crm-six.vercel.app";

function inviteEmailHtml(tenantName: string, inviteUrl: string, role: string, inviterEmail: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000000;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg,#171717 0%,#0d0d0d 100%);border:1px solid rgba(255,255,255,0.08);border-radius:24px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#9aea62;width:28px;height:28px;border-radius:8px;text-align:center;vertical-align:middle;">
                  <span style="font-size:14px;line-height:28px;color:#0a0a0a;font-weight:900;">▲</span>
                </td>
                <td style="padding-left:10px;font-size:14px;font-weight:700;color:#ffffff;">Liberty CRM</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 40px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;">
              Você foi convidado!
            </h1>
            <p style="margin:0 0 24px;font-size:14px;color:#939da4;line-height:1.6;">
              <strong style="color:#ffffff">${inviterEmail}</strong> convidou você para entrar no workspace <strong style="color:#9aea62">${tenantName}</strong> no Liberty CRM como <strong style="color:#ffffff">${ROLE_LABEL[role] ?? role}</strong>.
            </p>
            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:#9aea62;border-radius:500px;padding:14px 32px;">
                  <a href="${inviteUrl}" style="color:#0a0a0a;font-size:14px;font-weight:700;text-decoration:none;display:block;">
                    Aceitar convite e entrar
                  </a>
                </td>
              </tr>
            </table>
            <!-- Link fallback -->
            <p style="margin:0 0 8px;font-size:12px;color:#939da4;">
              Ou copie e cole este link no navegador:
            </p>
            <p style="margin:0;font-size:11px;color:#60a5fa;word-break:break-all;">${inviteUrl}</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="margin:0;font-size:11px;color:rgba(147,157,164,0.5);">
              Este convite expira em 7 dias. Se você não esperava receber este email, pode ignorá-lo.<br>
              © 2026 Liberty CRM
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
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, role, tenant_id } = await request.json();
  if (!email || !role || !tenant_id) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // Verificar permissão
  const { data: myRole } = await admin.from("tenant_members")
    .select("role").eq("tenant_id", tenant_id).eq("user_id", user.id).single();
  if (!myRole || !["owner", "admin"].includes(myRole.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // Buscar info do tenant
  const { data: tenant } = await admin.from("tenants").select("name").eq("id", tenant_id).single() as { data: any; error: unknown };

  // Criar invite token
  const { data: invite, error: inviteError } = await admin.from("invite_tokens").insert({
    tenant_id, email, role, invited_by: user.id,
  }).select("token").single() as { data: any; error: any };

  if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 });

  const inviteUrl = `${SITE_URL}/invite?token=${invite.token}`;
  const tenantName = tenant?.name ?? "Liberty CRM";

  // Enviar via Resend
  let emailSent = false;
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error: emailError } = await resend.emails.send({
        from: "Liberty CRM <noreply@adsliberty.com>",
        to: email,
        subject: `Você foi convidado para ${tenantName} no Liberty CRM`,
        html: inviteEmailHtml(tenantName, inviteUrl, role, user.email ?? "Alguém"),
      });
      emailSent = !emailError;
      if (emailError) console.error("Resend error:", emailError);
    } catch (e) {
      console.error("Resend exception:", e);
    }
  }

  return NextResponse.json({
    success: true,
    invite_url: inviteUrl,
    token: invite.token,
    email_sent: emailSent,
  });
}
