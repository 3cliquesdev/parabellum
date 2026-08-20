import { NextRequest, NextResponse } from "next/server";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";
import { getInternalApiSecret } from "@/lib/security/internal-auth";
import { sendMail } from "@/lib/mailer";

interface TicketAbertoRow {
  id: string;
  ticket_number: string | null;
  titulo: string;
  prioridade: string;
  due_date: string;
}

// Roda 1x/dia logo depois da virada (n8n schedule), diferente do
// /api/tickets/sla-vencido (que avisa pontualmente a cada vencimento novo):
// este e um resumo do que a equipe encontra pela manha - todos os tickets
// ainda em aberto com SLA vencido, nao so os vencidos nas ultimas horas.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;
  const admin = auth.admin;

  const { data, error } = await admin
    .from("tickets")
    .select("id, ticket_number, titulo, prioridade, due_date")
    .eq("tenant_id", tenantId)
    .is("resolved_at", null)
    .not("due_date", "is", null)
    .lt("due_date", new Date().toISOString())
    .order("due_date", { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const vencidos = (data ?? []) as TicketAbertoRow[];

  const { data: destinatarios } = await admin
    .from("tenant_members")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .eq("receber_alertas_operacionais", true);
  const userIds = ((destinatarios ?? []) as Array<{ user_id: string }>).map((d) => d.user_id);

  if (vencidos.length === 0) {
    return NextResponse.json({ vencidos: 0, avisados: 0 });
  }

  const linhas = vencidos.map((t) => `• ${t.ticket_number ?? t.id} (${t.prioridade}): ${t.titulo}`).join("\n");
  const textoWhatsapp = `📋 Resumo diário de SLA: ${vencidos.length} ticket(s) ainda em aberto com SLA vencido:\n\n${linhas}`;
  const htmlEmail = `<p><strong>Resumo diário de SLA — ${vencidos.length} ticket(s) ainda em aberto com SLA vencido:</strong></p><ul>${vencidos.map((t) => `<li>${t.ticket_number ?? t.id} (${t.prioridade}): ${t.titulo}</li>`).join("")}</ul>`;

  let whatsappResultado: unknown = null;
  const internalSecret = getInternalApiSecret();
  if (internalSecret) {
    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://3cliques-crm.vercel.app"}/api/whatsapp/send-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-key": internalSecret },
        body: JSON.stringify({ tenant_id: tenantId, conteudo: textoWhatsapp, tipo: "sla_relatorio_diario" }),
      });
      whatsappResultado = { status: resp.status, body: await resp.json().catch(() => null) };
    } catch (err) {
      whatsappResultado = { error: err instanceof Error ? err.message : "erro desconhecido" };
    }
  } else {
    whatsappResultado = { error: "INTERNAL_API_SECRET nao configurado" };
  }

  const emailResultados: unknown[] = [];
  for (const userId of userIds) {
    const { data: userData } = await admin.auth.admin.getUserById(userId);
    const email = userData.user?.email;
    if (!email) { emailResultados.push({ userId, error: "sem e-mail" }); continue; }
    const resultado = await sendMail({ to: email, subject: `Resumo diário: ${vencidos.length} ticket(s) com SLA vencido`, html: htmlEmail, fromName: "3Cliques CRM" });
    emailResultados.push({ email, ...resultado });
  }

  return NextResponse.json({ vencidos: vencidos.length, avisados: userIds.length, whatsapp: whatsappResultado, email: emailResultados });
}
