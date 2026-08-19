import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { LooseDatabase } from "@/types/database";

type Body = { token?: string; name?: string; password?: string };

function adminClient() {
  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

export async function POST(request: NextRequest) {
  const { token, name, password } = (await request.json().catch(() => ({}))) as Body;
  if (!token || !name?.trim() || !password || password.length < 8) {
    return NextResponse.json({ error: "Nome, senha de ao menos 8 caracteres e convite valido sao obrigatorios" }, { status: 400 });
  }
  const admin = adminClient();
  const { data: invite } = await admin.from("invite_tokens")
    .select("email, expires_at, accepted_at").eq("token", token).maybeSingle();
  const row = invite as { email?: string; expires_at?: string; accepted_at?: string | null } | null;
  if (!row?.email || row.accepted_at || !row.expires_at || new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ error: "Convite invalido, utilizado ou expirado" }, { status: 400 });
  }

  // Convites internos nao dependem de confirmacao por e-mail. O trigger do
  // banco valida o mesmo token e vincula este usuario ao tenant convidante.
  const { error } = await admin.auth.admin.createUser({
    email: row.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name.trim(), invite_token: token },
  });
  if (error) {
    const message = /already|registered|exists/i.test(error.message)
      ? "Este e-mail ja possui uma conta. Use Entrar ou Esqueceu a senha."
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
