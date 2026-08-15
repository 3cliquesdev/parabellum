import { NextRequest, NextResponse } from "next/server";
import { isInternalRequest } from "@/lib/security/internal-auth";
import { resolveInternalOrTenantAuth } from "@/lib/auth/internal-or-tenant";
import { logAiDecision } from "@/lib/security/ai-audit";

interface SendMessageBody {
  conversa_id?: string;
  tenant_id?: string;
  conteudo?: string;
  remetente?: "humano" | "ia";
  departamento?: string;
}

interface RelatedLeadRow {
  whatsapp: string | null;
}

interface ConversationRow {
  id: string;
  tenant_id: string;
  canal: string;
  lead_id: string | null;
  leads: RelatedLeadRow | RelatedLeadRow[] | null;
}

interface WhatsAppConfigRow {
  phone_number_id: string;
  access_token: string;
}

interface MetaMediaUploadResponse {
  id?: string;
}

type MediaMessageType = "image" | "audio" | "video" | "document";

function getLeadPhone(leads: ConversationRow["leads"]): string {
  const lead = Array.isArray(leads) ? leads[0] : leads;
  return lead?.whatsapp?.replace(/\D/g, "") ?? "";
}

function getMediaMessageType(mimeType: string): MediaMessageType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const isFormData = contentType.includes("multipart/form-data");

  let conversaId = "";
  let tenantId = "";
  let conteudo = "";
  let remetente: "humano" | "ia" = "humano";
  let departamento: string | undefined;
  let file: File | null = null;

  if (isFormData) {
    const formData = await request.formData();
    conversaId = String(formData.get("conversa_id") ?? "");
    tenantId = String(formData.get("tenant_id") ?? "");
    file = formData.get("file") as File | null;
    conteudo = file?.name ?? "";
  } else {
    const body = (await request.json().catch(() => ({}))) as SendMessageBody;
    conversaId = body.conversa_id ?? "";
    tenantId = body.tenant_id ?? "";
    conteudo = body.conteudo ?? "";
    remetente = body.remetente === "ia" ? "ia" : "humano";
    departamento = body.departamento;
  }

  if (!conversaId || !tenantId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const auth = await resolveInternalOrTenantAuth(request, tenantId);
  if (!auth.ok) return auth.response;
  const supabase = auth.admin;

  const { data: conversa } = await supabase
    .from("conversas")
    .select("*, leads(whatsapp)")
    .eq("id", conversaId)
    .single();
  const conversation = conversa as unknown as ConversationRow | null;
  if (!conversation || conversation.tenant_id !== tenantId) {
    return NextResponse.json({ error: "Conversa nao encontrada" }, { status: 404 });
  }

  if (conversation.canal !== "whatsapp") {
    if (!conteudo) return NextResponse.json({ error: "Conteudo vazio" }, { status: 400 });
    const { error: insertError } = await supabase.from("mensagens").insert({
      conversa_id: conversaId,
      tenant_id: tenantId,
      remetente,
      conteudo,
      enviada: true,
    });
    if (insertError) {
      return NextResponse.json({ error: `Falha ao salvar mensagem: ${insertError.message}` }, { status: 500 });
    }
    const updatesNaoWa: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (remetente === "ia") {
      updatesNaoWa.ultima_resposta_ia_em = new Date().toISOString();
      if (departamento) updatesNaoWa.ia_ultimo_departamento = departamento;
    }
    await supabase.from("conversas").update(updatesNaoWa).eq("id", conversaId);
    if (remetente === "ia" && isInternalRequest(request)) {
      await logAiDecision(supabase, {
        tenantId,
        leadId: conversation.lead_id,
        conversaId,
        acao: "enviar_resposta",
        detalhes: { canal: conversation.canal, conteudo },
      });
    }
    return NextResponse.json({ status: "sent" });
  }

  const { data: waConfig } = await supabase
    .from("whatsapp_configs")
    .select("phone_number_id, access_token")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .single();
  const config = waConfig as unknown as WhatsAppConfigRow | null;
  if (!config) return NextResponse.json({ error: "WhatsApp nao configurado" }, { status: 400 });

  const toNumber = getLeadPhone(conversation.leads);
  if (!toNumber) return NextResponse.json({ error: "Lead sem numero de WhatsApp" }, { status: 400 });

  let mediaUrl: string | null = null;
  let mediaType: MediaMessageType | null = null;
  let mediaNome: string | null = null;
  let mediaMime: string | null = null;

  if (file) {
    const mimeType = file.type;
    const buffer = await file.arrayBuffer();
    const fileName = `${tenantId}/${Date.now()}_${file.name}`;

    await supabase.storage.from("whatsapp-media").upload(fileName, buffer, {
      contentType: mimeType,
      upsert: true,
    });
    const { data: urlData } = supabase.storage.from("whatsapp-media").getPublicUrl(fileName);
    mediaUrl = urlData.publicUrl;
    mediaNome = file.name;
    mediaMime = mimeType;

    const metaFormData = new FormData();
    metaFormData.append("messaging_product", "whatsapp");
    metaFormData.append("file", new Blob([buffer], { type: mimeType }), file.name);

    const uploadResponse = await fetch(`https://graph.facebook.com/v20.0/${config.phone_number_id}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.access_token}` },
      body: metaFormData,
    });
    if (!uploadResponse.ok) {
      return NextResponse.json({ error: "Falha ao fazer upload da midia" }, { status: 500 });
    }

    const uploadData = (await uploadResponse.json()) as MetaMediaUploadResponse;
    const mediaId = uploadData.id;
    if (!mediaId) return NextResponse.json({ error: "Media id ausente" }, { status: 500 });

    mediaType = getMediaMessageType(mimeType);
    conteudo = file.name;

    const payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      to: toNumber,
      type: mediaType,
    };
    payload[mediaType] = mediaType === "document"
      ? { id: mediaId, filename: file.name }
      : { id: mediaId };

    const response = await fetch(`https://graph.facebook.com/v20.0/${config.phone_number_id}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.access_token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return NextResponse.json({ error: "Falha ao enviar midia" }, { status: 500 });
  } else {
    if (!conteudo) return NextResponse.json({ error: "Conteudo vazio" }, { status: 400 });

    const response = await fetch(`https://graph.facebook.com/v20.0/${config.phone_number_id}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.access_token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toNumber,
        type: "text",
        text: { body: conteudo },
      }),
    });
    if (!response.ok) return NextResponse.json({ error: "Falha ao enviar mensagem" }, { status: 500 });
  }

  const { error: insertError } = await supabase.from("mensagens").insert({
    conversa_id: conversaId,
    tenant_id: tenantId,
    remetente,
    conteudo,
    enviada: true,
    media_url: mediaUrl,
    media_type: mediaType,
    media_nome: mediaNome,
    media_mime: mediaMime,
  });
  if (insertError) {
    return NextResponse.json({ error: `Mensagem enviada mas nao salva: ${insertError.message}` }, { status: 500 });
  }
  const updatesWa: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (remetente === "ia") {
    updatesWa.ultima_resposta_ia_em = new Date().toISOString();
    if (departamento) updatesWa.ia_ultimo_departamento = departamento;
  }
  await supabase
    .from("conversas")
    .update(updatesWa)
    .eq("id", conversaId);

  if (remetente === "ia" && isInternalRequest(request)) {
    await logAiDecision(supabase, {
      tenantId,
      leadId: conversation.lead_id,
      conversaId,
      acao: "enviar_resposta",
      detalhes: { canal: "whatsapp", conteudo },
    });
  }

  return NextResponse.json({ status: "sent" });
}
