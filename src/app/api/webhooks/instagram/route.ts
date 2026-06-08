import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { handleInboundAutomation } from "@/lib/omnichannel/inbound-automation";
import { sendInstagramTextMessage } from "@/lib/meta-channel";

function adminClient() {
  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

type InstagramInboundEvent = {
  pageId: string;
  senderId: string;
  messageId: string;
  text: string;
  mediaUrl: string | null;
  metadata: Record<string, unknown>;
};

function getVerifyToken() {
  return process.env.INSTAGRAM_VERIFY_TOKEN ?? process.env.WHATSAPP_VERIFY_TOKEN ?? "liberty-instagram";
}

function extractEvents(body: any): InstagramInboundEvent[] {
  const events: InstagramInboundEvent[] = [];

  for (const entry of body?.entry ?? []) {
    const pageIdFromEntry = entry?.id ? String(entry.id) : null;

    for (const item of entry?.messaging ?? []) {
      if (item?.message?.is_echo) continue;

      const senderId = item?.sender?.id ? String(item.sender.id) : "";
      const pageId = item?.recipient?.id ? String(item.recipient.id) : (pageIdFromEntry ?? "");
      const messageId = item?.message?.mid ? String(item.message.mid) : "";
      const firstAttachment = item?.message?.attachments?.[0];
      const attachmentUrl = firstAttachment?.payload?.url ? String(firstAttachment.payload.url) : null;
      const text = item?.message?.text
        ? String(item.message.text)
        : firstAttachment?.type
          ? `[${String(firstAttachment.type)}]`
          : "";

      if (!senderId || !pageId || !messageId || !text) continue;

      events.push({
        pageId,
        senderId,
        messageId,
        text,
        mediaUrl: attachmentUrl,
        metadata: {
          raw_source: "messaging",
          attachment_type: firstAttachment?.type ?? null,
        },
      });
    }

    for (const change of entry?.changes ?? []) {
      const value = change?.value;
      for (const message of value?.messages ?? []) {
        const senderId = message?.from ? String(message.from) : "";
        const pageId = pageIdFromEntry ?? "";
        const messageId = message?.id ? String(message.id) : "";
        const imageUrl = message?.image?.url ? String(message.image.url) : null;
        const text = message?.text?.body
          ? String(message.text.body)
          : imageUrl
            ? "[image]"
            : "";

        if (!senderId || !pageId || !messageId || !text) continue;

        events.push({
          pageId,
          senderId,
          messageId,
          text,
          mediaUrl: imageUrl,
          metadata: {
            raw_source: "changes",
            change_field: change?.field ?? null,
          },
        });
      }
    }
  }

  return events;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (
    searchParams.get("hub.mode") === "subscribe" &&
    searchParams.get("hub.verify_token") === getVerifyToken()
  ) {
    return new NextResponse(searchParams.get("hub.challenge"), { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const events = extractEvents(body);
    if (events.length === 0) {
      return NextResponse.json({ status: "ok" });
    }

    const supabase = adminClient();

    for (const event of events) {
      const { data: config } = await supabase
        .from("instagram_configs")
        .select("tenant_id, page_id, instagram_business_account_id, access_token, active")
        .or(`page_id.eq.${event.pageId},instagram_business_account_id.eq.${event.pageId}`)
        .eq("active", true)
        .maybeSingle();

      if (!config?.tenant_id || !config?.access_token) {
        continue;
      }

      const tenantId = String(config.tenant_id);
      const accessToken = String(config.access_token);
      const pageId = String(config.page_id ?? event.pageId);

      await handleInboundAutomation({
        supabase,
        tenantId,
        canal: "instagram",
        identity: {
          canal: "instagram",
          value: null,
          externalId: event.senderId,
        },
        lead: {
          name: `Instagram ${event.senderId.slice(-6)}`,
        },
        message: {
          externalMessageId: event.messageId,
          text: event.text,
          mediaUrl: event.mediaUrl,
          mediaType: event.mediaUrl ? "image" : null,
          metadata: {
            canal: "instagram",
            direction: "inbound",
            page_id: pageId,
            sender_id: event.senderId,
            ...event.metadata,
          },
        },
        sender: {
          sendText: async (replyText) => {
            await sendInstagramTextMessage(accessToken, pageId, event.senderId, replyText);
          },
        },
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Instagram webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
