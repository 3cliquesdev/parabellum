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
  const novoUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://3cliques-crm.vercel.app"}/api/webhooks/whatsapp`;

  // Fase de migracao do numero principal: espelha pros dois sistemas ao mesmo
  // tempo (Parabellum + 3cliques-crm), pra validar o novo lado a lado antes de
  // desligar o antigo. Fora dessa janela (numero != principal), segue so pro
  // novo, como sempre foi.
  const destinos = isMainNumber
    ? [
        { nome: "crm-legado", url: process.env.WHATSAPP_MAIN_FORWARD_URL },
        { nome: "3cliques", url: novoUrl },
      ]
    : [{ nome: "3cliques", url: novoUrl }];

  console.info("WhatsApp router: evento recebido", {
    phoneNumberId: phoneNumberId ?? "ausente",
    destinos: destinos.map((d) => d.nome),
  });

  const resultados = await Promise.allSettled(
    destinos.map(async (destino) => {
      if (!destino.url) throw new Error(`URL nao configurada para destino ${destino.nome}`);
      const forwardResponse = await fetch(destino.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(signature ? { "x-hub-signature-256": signature } : {}),
        },
        body: rawBody,
        signal: AbortSignal.timeout(8000),
      });
      if (!forwardResponse.ok) throw new Error(`HTTP ${forwardResponse.status}`);
      return forwardResponse.status;
    }),
  );

  resultados.forEach((resultado, i) => {
    const destino = destinos[i];
    if (resultado.status === "fulfilled") {
      console.info("WhatsApp router: encaminhamento concluido", { phoneNumberId, destino: destino.nome, status: resultado.value });
    } else {
      console.error("WhatsApp router: falha ao encaminhar", { phoneNumberId, destino: destino.nome, erro: resultado.reason?.message ?? resultado.reason });
    }
  });

  return NextResponse.json({ status: "ok" });
}
