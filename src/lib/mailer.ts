import { Resend } from "resend";

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
}

export async function sendMail(opts: MailOptions): Promise<{ ok: boolean; error?: string }> {
  const { to, subject, html } = opts;

  if (!process.env.RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY nao configurada" };
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromName = opts.fromName ?? "3Cliques CRM";
    const fromEmail = opts.from ?? "noreply@mail.3cliques.net";
    const { error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      html,
    });
    if (error) {
      console.error("Resend recusou o envio:", error);
      return { ok: false, error: error.message ?? JSON.stringify(error) };
    }
    return { ok: true };
  } catch (err) {
    console.error("Resend fallback falhou:", err);
    return { ok: false, error: err instanceof Error ? err.message : "erro desconhecido" };
  }
}
