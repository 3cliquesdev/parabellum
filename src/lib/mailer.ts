import { Resend } from "resend";

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
}

export async function sendMail(opts: MailOptions): Promise<boolean> {
  const { to, subject, html } = opts;

  if (!process.env.RESEND_API_KEY) return false;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromName = opts.fromName ?? "3Cliques CRM";
    const fromEmail = opts.from ?? "noreply@3cliques.net";
    const { error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      html,
    });
    return !error;
  } catch (err) {
    console.error("Resend fallback falhou:", err);
    return false;
  }
}
