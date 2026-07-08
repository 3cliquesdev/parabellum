import type { SupabaseClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";
import { textToSpeech } from "@/lib/tts";

export function sanitizeMetaAccessToken(accessToken: string) {
  return accessToken.trim().replace(/^['"]+|['"]+$/g, "").replace(/\s+/g, "");
}

/**
 * Valida a assinatura X-Hub-Signature-256 que a Meta envia nos webhooks.
 * O HMAC-SHA256 e calculado sobre o corpo BRUTO da requisicao usando o
 * META_APP_SECRET como chave. Retorna false se o secret nao estiver
 * configurado ou a assinatura nao bater (comparacao timing-safe).
 */
export function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    console.error("META_APP_SECRET nao configurado — rejeitando webhook por seguranca.");
    return false;
  }
  if (!signatureHeader) return false;

  const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== receivedBuf.length) return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}

function describeMetaError(rawError: string, channel: "WhatsApp" | "Instagram") {
  if (rawError.includes('"code":190') || rawError.includes("Invalid OAuth access token")) {
    return `${channel} token invalido ou mal formatado. Refaça a conexão e salve novamente o access token da Meta.`;
  }

  return `${channel} send error: ${rawError}`;
}

export async function sendWhatsAppTextMessage(accessToken: string, phoneNumberId: string, to: string, text: string) {
  const sanitizedToken = sanitizeMetaAccessToken(accessToken);
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sanitizedToken}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) {
    throw new Error(describeMetaError(await res.text(), "WhatsApp"));
  }
}

export async function sendWhatsAppAudioMessage(accessToken: string, phoneNumberId: string, to: string, audioBuffer: Buffer) {
  const sanitizedToken = sanitizeMetaAccessToken(accessToken);
  const form = new FormData();
  const blob = new Blob([audioBuffer.buffer as ArrayBuffer], { type: "audio/mpeg" });

  form.append("messaging_product", "whatsapp");
  form.append("type", "audio/mpeg");
  form.append("file", blob, "resposta.mp3");

  const uploadRes = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${sanitizedToken}` },
    body: form,
  });

  if (!uploadRes.ok) {
    throw new Error(describeMetaError(await uploadRes.text(), "WhatsApp"));
  }

  const uploadData = (await uploadRes.json()) as { id?: string };
  if (!uploadData.id) {
    throw new Error("WhatsApp audio upload returned no media id");
  }

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sanitizedToken}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "audio",
      audio: { id: uploadData.id },
    }),
  });

  if (!res.ok) {
    throw new Error(describeMetaError(await res.text(), "WhatsApp"));
  }
}

export async function sendWhatsAppReplyWithOptionalAudio(
  accessToken: string,
  phoneNumberId: string,
  to: string,
  text: string,
  voice: string = "pt-BR-feminina",
) {
  try {
    const audioBuffer = await textToSpeech(text, voice);
    if (audioBuffer) {
      await sendWhatsAppAudioMessage(accessToken, phoneNumberId, to, audioBuffer);
      return true;
    }
  } catch (error) {
    console.error("WhatsApp audio reply error:", error);
  }

  await sendWhatsAppTextMessage(accessToken, phoneNumberId, to, text);
  return false;
}

export async function fetchAndStoreWhatsAppMedia(
  mediaId: string,
  accessToken: string,
  tenantId: string,
  supabase: SupabaseClient<any>,
): Promise<string> {
  const sanitizedToken = sanitizeMetaAccessToken(accessToken);
  const metaRes = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${sanitizedToken}` },
  });
  if (!metaRes.ok) throw new Error(`Meta media info failed: ${metaRes.status}`);

  const metaData = (await metaRes.json()) as { url?: string; mime_type?: string };
  if (!metaData.url || !metaData.mime_type) {
    throw new Error("Meta media info missing url or mime_type");
  }

  const fileRes = await fetch(metaData.url, { headers: { Authorization: `Bearer ${sanitizedToken}` } });
  if (!fileRes.ok) throw new Error(`Media download failed: ${fileRes.status}`);

  const buffer = await fileRes.arrayBuffer();
  const ext: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "video/mp4": "mp4",
    "application/pdf": "pdf",
  };
  const extension = ext[metaData.mime_type] ?? "bin";
  const fileName = `${tenantId}/${mediaId}.${extension}`;

  const { error } = await supabase.storage
    .from("whatsapp-media")
    .upload(fileName, buffer, { contentType: metaData.mime_type, upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from("whatsapp-media").getPublicUrl(fileName);
  return data.publicUrl;
}

export async function sendInstagramTextMessage(
  accessToken: string,
  pageId: string,
  recipientId: string,
  text: string,
) {
  const sanitizedToken = sanitizeMetaAccessToken(accessToken);
  const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sanitizedToken}` },
    body: JSON.stringify({
      recipient: { id: recipientId },
      messaging_type: "RESPONSE",
      message: { text },
    }),
  });

  if (!res.ok) {
    throw new Error(describeMetaError(await res.text(), "Instagram"));
  }

  const data = (await res.json()) as { message_id?: string; recipient_id?: string };
  return data.message_id ?? null;
}
