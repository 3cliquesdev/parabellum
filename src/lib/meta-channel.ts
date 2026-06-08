import type { SupabaseClient } from "@supabase/supabase-js";
import { textToSpeech } from "@/lib/tts";

export async function sendWhatsAppTextMessage(accessToken: string, phoneNumberId: string, to: string, text: string) {
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) {
    throw new Error(`WhatsApp send error: ${await res.text()}`);
  }
}

export async function sendWhatsAppAudioMessage(accessToken: string, phoneNumberId: string, to: string, audioBuffer: Buffer) {
  const form = new FormData();
  const blob = new Blob([audioBuffer.buffer as ArrayBuffer], { type: "audio/mpeg" });

  form.append("messaging_product", "whatsapp");
  form.append("type", "audio/mpeg");
  form.append("file", blob, "resposta.mp3");

  const uploadRes = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!uploadRes.ok) {
    throw new Error(`WhatsApp audio upload error: ${await uploadRes.text()}`);
  }

  const uploadData = (await uploadRes.json()) as { id?: string };
  if (!uploadData.id) {
    throw new Error("WhatsApp audio upload returned no media id");
  }

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "audio",
      audio: { id: uploadData.id },
    }),
  });

  if (!res.ok) {
    throw new Error(`WhatsApp send audio error: ${await res.text()}`);
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
  const metaRes = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!metaRes.ok) throw new Error(`Meta media info failed: ${metaRes.status}`);

  const metaData = (await metaRes.json()) as { url?: string; mime_type?: string };
  if (!metaData.url || !metaData.mime_type) {
    throw new Error("Meta media info missing url or mime_type");
  }

  const fileRes = await fetch(metaData.url, { headers: { Authorization: `Bearer ${accessToken}` } });
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
  const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      recipient: { id: recipientId },
      messaging_type: "RESPONSE",
      message: { text },
    }),
  });

  if (!res.ok) {
    throw new Error(`Instagram send error: ${await res.text()}`);
  }
}
