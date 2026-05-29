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

  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // Detectar se é FormData (mídia) ou JSON (texto)
  const contentType = request.headers.get("content-type") ?? "";
  const isFormData = contentType.includes("multipart/form-data");

  let conversa_id: string, tenant_id: string, conteudo: string = "";
  let file: File | null = null;

  if (isFormData) {
    const fd = await request.formData();
    conversa_id = fd.get("conversa_id") as string;
    tenant_id = fd.get("tenant_id") as string;
    file = fd.get("file") as File | null;
    conteudo = file?.name ?? "";
  } else {
    const body = await request.json();
    conversa_id = body.conversa_id;
    tenant_id = body.tenant_id;
    conteudo = body.conteudo;
  }

  if (!conversa_id || !tenant_id) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  // Buscar conversa + lead + wa config
  const { data: conversa } = await supabase.from("conversas").select("*, leads(whatsapp)").eq("id", conversa_id).single();
  if (!conversa) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  const { data: waConfig } = await supabase.from("whatsapp_configs")
    .select("phone_number_id, access_token").eq("tenant_id", tenant_id).eq("active", true).single();
  if (!waConfig) return NextResponse.json({ error: "WhatsApp não configurado" }, { status: 400 });

  const toNumber: string = conversa.leads?.whatsapp?.replace(/\D/g, "") ?? "";
  if (!toNumber) return NextResponse.json({ error: "Lead sem número de WhatsApp" }, { status: 400 });

  let mediaUrl: string | null = null;
  let mediaType: string | null = null;
  let mediaNome: string | null = null;
  let mediaMime: string | null = null;

  if (file) {
    // Upload arquivo para Meta → obter media_id → enviar
    const mimeType = file.type;
    const buffer = await file.arrayBuffer();

    // 1. Salvar no Supabase Storage
    const fileName = `${tenant_id}/${Date.now()}_${file.name}`;
    await supabase.storage.from("whatsapp-media").upload(fileName, buffer, { contentType: mimeType, upsert: true });
    const { data: urlData } = supabase.storage.from("whatsapp-media").getPublicUrl(fileName);
    mediaUrl = urlData.publicUrl;
    mediaNome = file.name;
    mediaMime = mimeType;

    // 2. Upload para Meta para obter media_id
    const metaFormData = new FormData();
    metaFormData.append("messaging_product", "whatsapp");
    metaFormData.append("file", new Blob([buffer], { type: mimeType }), file.name);
    const uploadRes = await fetch(`https://graph.facebook.com/v20.0/${waConfig.phone_number_id}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${waConfig.access_token}` },
      body: metaFormData,
    });
    if (!uploadRes.ok) return NextResponse.json({ error: "Falha ao fazer upload da mídia" }, { status: 500 });
    const { id: mediaId } = await uploadRes.json();

    // 3. Determinar tipo de mensagem
    const typeMap: Record<string, string> = {
      "image/": "image", "audio/": "audio", "video/": "video",
    };
    const msgType = Object.entries(typeMap).find(([k]) => mimeType.startsWith(k))?.[1] ?? "document";
    mediaType = msgType;
    conteudo = file.name;

    // 4. Enviar via Meta
    const body: any = { messaging_product: "whatsapp", to: toNumber, type: msgType };
    body[msgType] = msgType === "document"
      ? { id: mediaId, filename: file.name }
      : { id: mediaId };
    const res = await fetch(`https://graph.facebook.com/v20.0/${waConfig.phone_number_id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${waConfig.access_token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) return NextResponse.json({ error: "Falha ao enviar mídia" }, { status: 500 });

  } else {
    // Enviar texto
    if (!conteudo) return NextResponse.json({ error: "Conteúdo vazio" }, { status: 400 });
    const res = await fetch(`https://graph.facebook.com/v20.0/${waConfig.phone_number_id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${waConfig.access_token}` },
      body: JSON.stringify({ messaging_product: "whatsapp", to: toNumber, type: "text", text: { body: conteudo } }),
    });
    if (!res.ok) return NextResponse.json({ error: "Falha ao enviar mensagem" }, { status: 500 });
  }

  // Salvar no banco
  await supabase.from("mensagens").insert({
    conversa_id, tenant_id, remetente: "humano", conteudo, enviada: true,
    media_url: mediaUrl, media_type: mediaType, media_nome: mediaNome, media_mime: mediaMime,
  });
  await supabase.from("conversas").update({ updated_at: new Date().toISOString() }).eq("id", conversa_id);

  return NextResponse.json({ status: "sent" });
}
