import { Resend } from "resend";
import * as nodemailer from "nodemailer";

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
}

export interface AgencySmtp {
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_user?: string | null;
  smtp_pass?: string | null;
  smtp_from?: string | null;
  smtp_from_name?: string | null;
}

// Envia email usando SMTP da agência (se configurado) ou Resend como fallback
export async function sendMail(opts: MailOptions, agencySmtp?: AgencySmtp): Promise<boolean> {
  const { to, subject, html } = opts;

  // Tentar SMTP customizado da agência
  if (agencySmtp?.smtp_host && agencySmtp?.smtp_user && agencySmtp?.smtp_pass) {
    try {
      const transporter = nodemailer.createTransport({
        host: agencySmtp.smtp_host,
        port: agencySmtp.smtp_port ?? 587,
        secure: (agencySmtp.smtp_port ?? 587) === 465,
        auth: {
          user: agencySmtp.smtp_user,
          pass: agencySmtp.smtp_pass,
        },
      });

      const fromName = opts.fromName ?? agencySmtp.smtp_from_name ?? "CRM";
      const fromEmail = opts.from ?? agencySmtp.smtp_from ?? agencySmtp.smtp_user;

      await transporter.sendMail({
        from: `${fromName} <${fromEmail}>`,
        to,
        subject,
        html,
      });

      return true;
    } catch (err) {
      console.error("SMTP customizado falhou, usando fallback Resend:", err);
    }
  }

  // Fallback: Resend
  if (!process.env.RESEND_API_KEY) return false;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromName = opts.fromName ?? "Liberty CRM";
    const fromEmail = opts.from ?? "noreply@adsliberty.com";
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
