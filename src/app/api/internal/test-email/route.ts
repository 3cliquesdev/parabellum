import { NextRequest, NextResponse } from "next/server";
import { isInternalRequest } from "@/lib/security/internal-auth";
import { renderInviteEmailHtml } from "@/lib/email/invite-template";
import { sendMail } from "@/lib/mailer";

// Endpoint temporario para pre-visualizar o email de convite com a
// identidade visual real de um tenant, sem precisar de sessao de navegador.
export async function POST(request: NextRequest) {
  if (!isInternalRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { to?: string };
  if (!body.to) return NextResponse.json({ error: "to required" }, { status: 400 });

  const html = renderInviteEmailHtml({
    tenantName: "3Cliques",
    inviteUrl: "https://3cliques-crm.vercel.app/invite?token=teste-preview-000000",
    role: "gerente",
    inviterEmail: "ronildo.santos@3cliques.net",
    branding: {
      nome: "3Cliques",
      logoUrl: undefined,
      corPrimaria: "#9aea62",
      emailTheme: "dark",
      whiteLabel: false,
    },
    siteUrl: "https://3cliques-crm.vercel.app",
  });

  const result = await sendMail({
    to: body.to,
    subject: "[TESTE] Voce foi convidado para 3Cliques",
    html,
    fromName: "3Cliques | 3Cliques CRM",
  });

  return NextResponse.json(result);
}
