import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { LooseDatabase } from "@/types/database";
import { ingestInboundMessage, type InboxIdentityInput, type InboxLeadInput, type InboxMessageInput } from "@/lib/inbox/service";
import type { InboxExternalCanal } from "@/lib/inbox/channels";

const SUPPORTED_CHANNELS: InboxExternalCanal[] = [
  "whatsapp",
  "email",
  "instagram",
  "telegram",
  "facebook_messenger",
];

interface IntakeBody {
  tenant_id?: string;
  canal?: InboxExternalCanal;
  identity?: {
    value?: string | null;
    external_id?: string | null;
  };
  lead?: {
    id?: string | null;
    name?: string | null;
    identities?: Array<{
      canal?: InboxExternalCanal;
      value?: string | null;
      external_id?: string | null;
    }>;
  };
  message?: {
    id?: string | null;
    text?: string | null;
    media_url?: string | null;
    media_type?: InboxMessageInput["mediaType"];
    media_name?: string | null;
    media_mime?: string | null;
    media_caption?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    metadata?: Record<string, unknown> | null;
  };
}

async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
}

function createAdminClient() {
  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

function isSupportedChannel(value: string | undefined): value is InboxExternalCanal {
  return SUPPORTED_CHANNELS.includes(value as InboxExternalCanal);
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.INBOX_INGEST_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const providedSecret = request.headers.get("x-inbox-secret") ?? request.headers.get("x-internal-key");
  const isSecretAuthorized = Boolean(expectedSecret && providedSecret && providedSecret === expectedSecret);

  const body = (await request.json().catch(() => ({}))) as IntakeBody;
  const tenantId = body.tenant_id ?? "";
  const canal = body.canal;

  if (!tenantId || !isSupportedChannel(canal)) {
    return NextResponse.json({ error: "tenant_id e canal valido sao obrigatorios" }, { status: 400 });
  }

  if (!isSecretAuthorized) {
    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: membership } = await admin
      .from("tenant_members")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const identity: InboxIdentityInput = {
    canal,
    value: body.identity?.value ?? null,
    externalId: body.identity?.external_id ?? null,
  };

  if (!identity.value && !identity.externalId) {
    return NextResponse.json({ error: "identity.value ou identity.external_id e obrigatorio" }, { status: 400 });
  }

  const leadInput: InboxLeadInput | undefined = body.lead
    ? {
        id: body.lead.id ?? null,
        name: body.lead.name ?? null,
        identities: (body.lead.identities ?? []).flatMap((item) => {
          if (!item?.canal || !isSupportedChannel(item.canal)) return [];
          return [{
            canal: item.canal,
            value: item.value ?? null,
            externalId: item.external_id ?? null,
          }];
        }),
      }
    : undefined;

  const message: InboxMessageInput = {
    externalMessageId: body.message?.id ?? null,
    text: body.message?.text ?? null,
    mediaUrl: body.message?.media_url ?? null,
    mediaType: body.message?.media_type ?? null,
    mediaName: body.message?.media_name ?? null,
    mediaMime: body.message?.media_mime ?? null,
    mediaCaption: body.message?.media_caption ?? null,
    latitude: body.message?.latitude ?? null,
    longitude: body.message?.longitude ?? null,
    metadata: body.message?.metadata ?? { canal, direction: "inbound" },
  };

  if (!message.text && !message.mediaUrl) {
    return NextResponse.json({ error: "message.text ou message.media_url e obrigatorio" }, { status: 400 });
  }

  const admin = createAdminClient();
  const result = await ingestInboundMessage({
    supabase: admin,
    tenantId,
    canal,
    identity,
    lead: leadInput,
    message,
  });

  return NextResponse.json({
    ok: true,
    duplicate: result.duplicate,
    lead_id: result.lead?.id ?? null,
    conversa_id: result.conversation?.id ?? null,
  });
}
