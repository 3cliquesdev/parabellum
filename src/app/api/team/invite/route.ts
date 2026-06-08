import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sendMail, type AgencySmtp } from "@/lib/mailer";
import { renderInviteEmailHtml, type InviteEmailBranding } from "@/lib/email/invite-template";
import type { EmailTheme, LooseDatabase } from "@/types/database";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liberty-crm-six.vercel.app";

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
  email_theme: EmailTheme | null;
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
    .select("name, nome_fantasia, logo_url, cor_primaria, email_theme, white_label, agency_id")
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
  const branding: InviteEmailBranding = {
    nome: tenantName,
    logoUrl: tenantData?.white_label && tenantData?.logo_url ? tenantData.logo_url : undefined,
    corPrimaria: tenantData?.cor_primaria ?? "#9aea62",
    emailTheme: tenantData?.email_theme === "light" ? "light" : "dark",
    whiteLabel: tenantData?.white_label ?? false,
  };
  const agencyDisplayName = agencySmtp?.display_name ?? agencySmtp?.name;
  const fromName = agencyDisplayName ? `${agencyDisplayName}` : `${tenantName} | Liberty CRM`;

  const emailSent = await sendMail(
    {
      to: email,
      subject: `Voce foi convidado para ${tenantName}`,
      html: renderInviteEmailHtml({
        tenantName,
        inviteUrl,
        role,
        inviterEmail: user.email ?? "Alguem",
        branding,
        siteUrl: SITE_URL,
      }),
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
