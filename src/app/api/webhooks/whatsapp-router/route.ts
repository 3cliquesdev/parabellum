import { NextRequest, NextResponse } from "next/server";
import { verifyMetaSignature } from "@/lib/meta-channel";

interface RouterWebhookBody {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
      };
    }>;
  }>;
}

/**
 * Ponte temporaria: a Meta so permite UM callback URL por App inteiro
 * (nao por numero de telefone). Enquanto o numero principal continua em
 * producao no Parabellum e o 3cliques-crm testa com um numero novo no
 * MESMO App da Meta, este endpoint recebe tudo e roteia por phone_number_id.
 *
 * Descartavel: quando o numero principal migrar de vez, aponte o webhook
 * da Meta direto para /api/webhooks/whatsapp e apague esta rota.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (
    searchParams.get("hub.mode") === "subscribe" &&
    searchParams.get("hub.verify_token") === process.env.WHATSAPP_ROUTER_VERIFY_TOKEN
  ) {
    return new NextResponse(searchParams.get("hub.challenge"), { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyMetaSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let phoneNumberId: string | undefined;
  try {
    const body = JSON.parse(rawBody) as RouterWebhookBody;
    phoneNumberId = body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
  } catch {
    // Corpo sem JSON valido — repassa mesmo assim pro numero principal (comportamento atual).
  }

  const isMainNumber = phoneNumberId === process.env.WHATSAPP_MAIN_PHONE_NUMBER_ID;
  const targetUrl = isMainNumber
    ? process.env.WHATSAPP_MAIN_FORWARD_URL
    : `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://3cliques-crm.vercel.app"}/api/webhooks/whatsapp`;

  console.info("WhatsApp router: evento recebido", {
    phoneNumberId: phoneNumberId ?? "ausente",
    destination: isMainNumber ? "crm-legado" : "3cliques",
  });

  if (!targetUrl) {
    console.error("WHATSAPP_MAIN_FORWARD_URL nao configurado — nao foi possivel rotear.");
    return NextResponse.json({ status: "ok" });
  }

  try {
    const forwardResponse = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(signature ? { "x-hub-signature-256": signature } : {}),
      },
      body: rawBody,
      signal: AbortSignal.timeout(8000),
    });
    console.info("WhatsApp router: encaminhamento concluido", {
      phoneNumberId: phoneNumberId ?? "ausente",
      destination: isMainNumber ? "crm-legado" : "3cliques",
      status: forwardResponse.status,
    });
  } catch (error) {
    console.error("Falha ao rotear webhook do WhatsApp:", error);
  }

  return NextResponse.json({ status: "ok" });
}
