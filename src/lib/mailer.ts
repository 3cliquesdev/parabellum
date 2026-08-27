import { Resend } from "resend";
import { createAdminClient } from "@/lib/auth/guard";

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
}

// Registro de todo envio (sucesso ou falha) - existia zero visibilidade de
// quem recebia o que e quando, entao um relato tipo "ainda chega e-mail
// mesmo desativado" so podia ser investigado lendo codigo e adivinhando.
// Best-effort: nunca deixa o log derrubar o envio de verdade.
async function registrarEnvio(opts: MailOptions, resultado: { ok: boolean; error?: string; id?: string }) {
  try {
    const admin = createAdminClient();
    await admin.from("email_send_log").insert({
      to_email: opts.to,
      subject: opts.subject,
      from_name: opts.fromName ?? null,
      ok: resultado.ok,
      error: resultado.error ?? null,
      resend_id: resultado.id ?? null,
    });
  } catch (err) {
    console.error("Falha ao registrar email_send_log:", err);
  }
}

export async function sendMail(opts: MailOptions): Promise<{ ok: boolean; error?: string; id?: string }> {
  const { to, subject, html } = opts;

  if (!process.env.RESEND_API_KEY) {
    const resultado = { ok: false, error: "RESEND_API_KEY nao configurada" };
    await registrarEnvio(opts, resultado);
    return resultado;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromName = opts.fromName ?? "Parabellum";
    const fromEmail = opts.from ?? "noreply@mail.3cliques.net";
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      html,
    });
    if (error) {
      console.error("Resend recusou o envio:", error);
      const resultado = { ok: false, error: error.message ?? JSON.stringify(error) };
      await registrarEnvio(opts, resultado);
      return resultado;
    }
    const resultado = { ok: true, id: data?.id };
    await registrarEnvio(opts, resultado);
    return resultado;
  } catch (err) {
    console.error("Resend fallback falhou:", err);
    const resultado = { ok: false, error: err instanceof Error ? err.message : "erro desconhecido" };
    await registrarEnvio(opts, resultado);
    return resultado;
  }
}
