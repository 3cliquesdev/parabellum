import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  const supabaseAuth = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversa_id, conteudo, tenant_id } = await request.json();
  if (!conversa_id || !conteudo || !tenant_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // Buscar conversa + lead + wa config
  const { data: conversa } = await supabase
    .from("conversas")
    .select("*, leads(whatsapp)")
    .eq("id", conversa_id)
    .single();

  if (!conversa) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  const { data: waConfig } = await supabase
    .from("whatsapp_configs")
    .select("phone_number_id, access_token")
    .eq("tenant_id", tenant_id)
    .eq("active", true)
    .single();

  if (!waConfig) return NextResponse.json({ error: "WhatsApp não configurado" }, { status: 400 });

  const toNumber: string = conversa.leads?.whatsapp?.replace(/\D/g, "") ?? "";
  if (!toNumber) return NextResponse.json({ error: "Lead sem número de WhatsApp" }, { status: 400 });

  // Inserir mensagem no banco
  await supabase.from("mensagens").insert({
    conversa_id,
    tenant_id,
    remetente: "humano",
    conteudo,
    enviada: false,
  });

  // Enviar via Meta API
  const res = await fetch(
    `https://graph.facebook.com/v20.0/${waConfig.phone_number_id}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${waConfig.access_token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toNumber,
        type: "text",
        text: { body: conteudo },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("WhatsApp send error:", err);
    return NextResponse.json({ error: "Falha ao enviar mensagem" }, { status: 500 });
  }

  // Marcar como enviada
  await supabase
    .from("mensagens")
    .update({ enviada: true })
    .eq("conversa_id", conversa_id)
    .eq("remetente", "humano")
    .eq("enviada", false);

  // Atualizar updated_at da conversa
  await supabase
    .from("conversas")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversa_id);

  return NextResponse.json({ status: "sent" });
}
