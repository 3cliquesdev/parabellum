import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const auth = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { webhook_id } = await request.json();

  const admin = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: webhook } = await admin.from("webhook_configs").select("*").eq("id", webhook_id).single() as { data: any };
  if (!webhook) return NextResponse.json({ error: "Webhook não encontrado" }, { status: 404 });

  const payload = {
    event: "test.ping",
    tenant_id: webhook.tenant_id,
    data: { message: "Webhook do Liberty CRM funcionando!", timestamp: new Date().toISOString() },
    timestamp: new Date().toISOString(),
  };

  const signature = crypto.createHmac("sha256", webhook.secret ?? "").update(JSON.stringify(payload)).digest("hex");

  try {
    const res = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Liberty-Signature": `sha256=${signature}`,
        "X-Liberty-Event": "test.ping",
        "User-Agent": "LibertyPlatform/1.0",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    const sucesso = res.ok;
    await admin.from("webhook_logs").insert({ webhook_id, tenant_id: webhook.tenant_id, evento: "test.ping", payload, status_code: res.status, sucesso });
    await admin.from("webhook_configs").update({ ultimo_envio: new Date().toISOString(), ultimo_erro: sucesso ? null : `HTTP ${res.status}` }).eq("id", webhook_id);

    return NextResponse.json({ sucesso, status: res.status, message: sucesso ? "Webhook enviado com sucesso!" : `Erro HTTP ${res.status}` });
  } catch (err: any) {
    await admin.from("webhook_configs").update({ ultimo_erro: err.message }).eq("id", webhook_id);
    return NextResponse.json({ sucesso: false, message: err.message }, { status: 500 });
  }
}
