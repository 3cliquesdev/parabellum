import type { SupabaseClient } from "@supabase/supabase-js";
import type { LooseDatabase } from "@/types/database";
import { sendMail } from "@/lib/mailer";

type AdminClient = SupabaseClient<LooseDatabase>;

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendOtpEmail(
  admin: AdminClient,
  params: { tenantId: string; leadId: string; conversaId: string; email: string },
): Promise<{ ok: boolean; error?: string }> {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

  const { error } = await admin.from("otp_verifications").insert({
    tenant_id: params.tenantId,
    lead_id: params.leadId,
    conversa_id: params.conversaId,
    email: params.email,
    code,
    expires_at: expiresAt,
  });
  if (error) return { ok: false, error: error.message };

  const sent = await sendMail({
    to: params.email,
    subject: "Código de verificação — Parabellum",
    html: `<p>Seu código de verificação é:</p><h2 style="letter-spacing:4px">${code}</h2><p>Válido por ${OTP_TTL_MINUTES} minutos. Se você não pediu isso, ignore este e-mail.</p>`,
  });
  if (!sent.ok) return { ok: false, error: sent.error ?? "Falha ao enviar e-mail" };

  return { ok: true };
}

export async function verifyOtpCode(
  admin: AdminClient,
  params: { tenantId: string; conversaId: string; code: string },
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await admin
    .from("otp_verifications")
    .select("id, code, expires_at, verified, attempts")
    .eq("tenant_id", params.tenantId)
    .eq("conversa_id", params.conversaId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  const row = data as { id: string; code: string; expires_at: string; verified: boolean; attempts: number } | null;
  if (!row) return { ok: false, error: "Nenhum código enviado para esta conversa" };
  if (row.verified) return { ok: true };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "Número máximo de tentativas excedido, peça um novo código" };
  if (new Date(row.expires_at) < new Date()) return { ok: false, error: "Código expirado, peça um novo" };

  if (row.code !== params.code.trim()) {
    await admin.from("otp_verifications").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    return { ok: false, error: "Código incorreto" };
  }

  await admin.from("otp_verifications").update({ verified: true }).eq("id", row.id);
  await admin.from("conversas").update({ financeiro_verificado_em: new Date().toISOString() }).eq("id", params.conversaId);
  return { ok: true };
}
