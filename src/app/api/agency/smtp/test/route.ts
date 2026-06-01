import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sendMail } from "@/lib/mailer";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_from_name } = await request.json();

  const success = await sendMail(
    {
      to: user.email!,
      subject: "Teste de SMTP — Liberty CRM",
      html: `<p>Olá! Este é um email de teste enviado pelo Liberty CRM para verificar as configurações de SMTP da sua agência.</p><p>Se você recebeu este email, a configuração está correta.</p>`,
      fromName: smtp_from_name || "Liberty CRM",
    },
    { smtp_host, smtp_port: parseInt(smtp_port) || 587, smtp_user, smtp_pass, smtp_from, smtp_from_name }
  );

  if (success) {
    return NextResponse.json({ success: true, message: `Email de teste enviado para ${user.email}` });
  }
  return NextResponse.json({ success: false, message: "Falha ao enviar. Verifique as credenciais." }, { status: 400 });
}
