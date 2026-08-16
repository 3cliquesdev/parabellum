import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { transcribeAudio } from "@/lib/speech";
import {
  fetchAndStoreWhatsAppMedia,
  sendWhatsAppAudioMessage,
  sendWhatsAppTextMessage,
  verifyMetaSignature,
} from "@/lib/meta-channel";
import { handleInboundAutomation } from "@/lib/omnichannel/inbound-automation";
import type { LooseDatabase } from "@/types/database";

function adminClient() {
  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

interface WhatsAppMediaPayload {
  id?: string;
  caption?: string;
  filename?: string;
  mime_type?: string;
}

interface WhatsAppInboundMessage {
  type: string;
  from: string;
  id: string;
  context?: { id?: string };
  text?: { body?: string };
  location?: {
    latitude?: number;
    longitude?: number;
    name?: string;
  };
  voice?: WhatsAppMediaPayload;
  audio?: WhatsAppMediaPayload;
  image?: WhatsAppMediaPayload;
  video?: WhatsAppMediaPayload;
  document?: WhatsAppMediaPayload;
  sticker?: WhatsAppMediaPayload;
}

interface WhatsAppStatusUpdate {
  id?: string;
  status?: "sent" | "delivered" | "read" | "failed";
  recipient_id?: string;
}

interface WhatsAppWebhookBody {
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string };
        messages?: WhatsAppInboundMessage[];
        statuses?: WhatsAppStatusUpdate[];
      };
    }>;
  }>;
}

const STATUS_RANK: Record<string, number> = { sending: 0, sent: 1, delivered: 2, read: 3 };

async function processStatusUpdates(
  supabase: ReturnType<typeof adminClient>,
  statuses: WhatsAppStatusUpdate[],
) {
  for (const status of statuses) {
    if (!status.id || !status.status) continue;

    const { data: existing } = await supabase
      .from("mensagens")
      .select("id, status")
      .or(`wa_message_id.eq.${status.id},external_message_id.eq.${status.id}`)
      .maybeSingle();

    const row = existing as { id?: string; status?: string | null } | null;
    if (!row?.id) continue;

    const currentRank = STATUS_RANK[row.status ?? "sending"] ?? 0;
    const incomingRank = STATUS_RANK[status.status] ?? 0;
    // Nunca deixa um evento atrasado da Meta regredir um status ja mais
    // avancado (ex: "sent" chegando depois de "read" ja confirmado).
    if (incomingRank <= currentRank) continue;

    await supabase.from("mensagens").update({ status: status.status }).eq("id", row.id);
  }
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
    const rawBody = await request.text();
    if (!verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    const body = JSON.parse(rawBody) as WhatsAppWebhookBody;
    const value = body?.entry?.[0]?.changes?.[0]?.value;
    if (!value || body?.entry?.[0]?.changes?.[0]?.field !== "messages") {
      return NextResponse.json({ status: "ok" });
    }

    const phoneNumberId = value.metadata?.phone_number_id as string | undefined;
    const messages = value.messages ?? [];
    const statuses = value.statuses ?? [];
    if (!phoneNumberId || (messages.length === 0 && statuses.length === 0)) {
      return NextResponse.json({ status: "ok" });
    }

    const supabase = adminClient();

    if (statuses.length > 0) {
      await processStatusUpdates(supabase, statuses);
    }

    if (messages.length === 0) {
      return NextResponse.json({ status: "ok" });
    }

    const { data: waConfig } = await supabase
      .from("whatsapp_configs")
      .select("id, tenant_id, access_token, active, dedicado_para_user_id, ia_ativa_padrao")
      .eq("phone_number_id", phoneNumberId)
      .eq("active", true)
      .single();

    if (!waConfig) {
      return NextResponse.json({ status: "ok" });
    }

    const tenantId = waConfig.tenant_id as string;
    const accessToken = waConfig.access_token as string;
    const channelHints = {
      whatsappConfigId: waConfig.id as string,
      assignedTo: (waConfig.dedicado_para_user_id as string | null) ?? null,
      iaAtivaPadrao: (waConfig.ia_ativa_padrao as boolean | null) ?? true,
    };
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
        const mediaData = (
          message[message.type as keyof WhatsAppInboundMessage] ??
          message.voice ??
          message.audio ??
          {}
        ) as WhatsAppMediaPayload;
        text = mediaData.caption || `[${message.type}]`;
        mediaCaption = mediaData.caption || null;
        mediaName = mediaData.filename || null;
        mediaMime = mediaData.mime_type || null;
        mediaType = (message.type === "voice" ? "audio" : message.type) as Exclude<typeof mediaType, null>;

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
          replyToWaMessageId: message.context?.id ?? null,
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
        channelHints,
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
