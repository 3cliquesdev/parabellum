import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { transcribeAudio } from "@/lib/speech";
import {
  fetchAndStoreWhatsAppMedia,
  sendWhatsAppAudioMessage,
  sendWhatsAppTextMessage,
} from "@/lib/meta-channel";
import { handleInboundAutomation } from "@/lib/omnichannel/inbound-automation";

function adminClient() {
  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (
    searchParams.get("hub.mode") === "subscribe" &&
    searchParams.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new NextResponse(searchParams.get("hub.challenge"), { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const value = body?.entry?.[0]?.changes?.[0]?.value;
    if (!value || body?.entry?.[0]?.changes?.[0]?.field !== "messages") {
      return NextResponse.json({ status: "ok" });
    }

    const phoneNumberId = value.metadata?.phone_number_id as string | undefined;
    const messages = (value.messages ?? []) as any[];
    if (!phoneNumberId || messages.length === 0) {
      return NextResponse.json({ status: "ok" });
    }

    const supabase = adminClient();
    const { data: waConfig } = await supabase
      .from("whatsapp_configs")
      .select("tenant_id, access_token, active")
      .eq("phone_number_id", phoneNumberId)
      .eq("active", true)
      .single();

    if (!waConfig) {
      return NextResponse.json({ status: "ok" });
    }

    const tenantId = waConfig.tenant_id as string;
    const accessToken = waConfig.access_token as string;
    const supportedTypes = new Set(["text", "image", "audio", "video", "document", "sticker", "location", "voice"]);

    for (const message of messages) {
      if (!supportedTypes.has(message.type)) continue;

      const fromNumber = message.from as string;
      const waMessageId = message.id as string;

      let text = "";
      let mediaUrl: string | null = null;
      let mediaType: "image" | "audio" | "video" | "document" | "sticker" | "location" | null = null;
      let mediaName: string | null = null;
      let mediaMime: string | null = null;
      let mediaCaption: string | null = null;
      let latitude: number | null = null;
      let longitude: number | null = null;

      if (message.type === "text") {
        text = message.text?.body ?? "";
      } else if (message.type === "location") {
        latitude = message.location?.latitude ?? null;
        longitude = message.location?.longitude ?? null;
        text = `[Localizacao] ${message.location?.name ?? ""}`.trim();
        mediaType = "location";
      } else {
        const mediaData = message[message.type] ?? message.voice ?? message.audio ?? {};
        text = mediaData.caption || `[${message.type}]`;
        mediaCaption = mediaData.caption || null;
        mediaName = mediaData.filename || null;
        mediaMime = mediaData.mime_type || null;
        mediaType = message.type === "voice" ? "audio" : message.type;

        if (mediaData.id) {
          try {
            mediaUrl = await fetchAndStoreWhatsAppMedia(mediaData.id, accessToken, tenantId, supabase);
            if ((message.type === "audio" || message.type === "voice") && mediaUrl) {
              const transcription = await transcribeAudio(mediaUrl, mediaMime);
              if (transcription) {
                text = `[Audio transcrito]: ${transcription}`;
              }
            }
          } catch (error) {
            console.error("WhatsApp media fetch error:", error);
          }
        }
      }

      await handleInboundAutomation({
        supabase,
        tenantId,
        canal: "whatsapp",
        identity: {
          canal: "whatsapp",
          value: fromNumber,
        },
        lead: {
          name: `Lead ${fromNumber}`,
        },
        message: {
          externalMessageId: waMessageId,
          waMessageId,
          text,
          mediaUrl,
          mediaType,
          mediaName,
          mediaMime,
          mediaCaption,
          latitude,
          longitude,
          metadata: {
            canal: "whatsapp",
            direction: "inbound",
            message_type: message.type,
            phone_number_id: phoneNumberId,
          },
        },
        sender: {
          sendText: (replyText) => sendWhatsAppTextMessage(accessToken, phoneNumberId, fromNumber, replyText),
          sendAudioBuffer: (audioBuffer) => sendWhatsAppAudioMessage(accessToken, phoneNumberId, fromNumber, audioBuffer),
        },
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
