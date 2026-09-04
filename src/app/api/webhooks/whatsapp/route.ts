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
  button?: { payload?: string; text?: string };
  interactive?: {
    type?: "button_reply" | "list_reply";
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string; description?: string };
  };
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

interface WhatsAppContact {
  wa_id?: string;
  profile?: { name?: string };
}

interface WhatsAppWebhookBody {
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: WhatsAppContact[];
        messages?: WhatsAppInboundMessage[];
        statuses?: WhatsAppStatusUpdate[];
      };
    }>;
  }>;
}

const STATUS_RANK: Record<string, number> = { sending: 0, sent: 1, delivered: 2, read: 3 };
// Achado 2026-09-01: este placeholder de teste (auditoria de reconciliação
// do fornecedor Jonh, período 01-25/08) ficou esquecido como conteúdo fixo
// de produção — todo clique em "Receber relatório" mandava sempre este
// texto antigo, nunca o fechamento mensal de verdade. Substituído pelo
// fechamento executivo real (gerado em sabr-analytics), em 5 partes
// sequenciais por causa do limite prático de mensagem de texto do WhatsApp.
const MONTHLY_REPORT_PARTS: string[] = [
  `📊 *FECHAMENTO EXECUTIVO SABR — AGOSTO/2026 (v5)*
_Período: 01/08 a 31/08 (BRT) | Recalculado em 01/09_
_AXIOM (reconciliação) + SENTINEL (operação) + ATLAS (estoque)_
*Parte 1/5 — Kiwify: vendas, reembolso e ponte de reconciliação*

━━━━━━━━━━━━━━━━━
*1. KIWIFY — ASSINATURAS E VENDAS NOVAS*
━━━━━━━━━━━━━━━━━

• 1.249 vendas | *R$ 182.103,89*
• Meta: 2.290 vendas / R$ 295.000 → *54,5% / 61,7%* da meta
• Contra julho (1.467 vendas / R$ 211.946,44): *-14,9% vendas, -14,1% receita*

*Ponte de reconciliação (status: VALIDADO — bate exato):*
Base bruta paga (agosto): 1.683 vendas | R$ 187.323,77
− Produtos complementares (order bump/upsell, fora do escopo de assinatura): 434 vendas | R$ 5.219,88
− Inativos: 0
*= Base gerencial oficial: 1.249 vendas | R$ 182.103,89* ✓ bate exato com o número acima

*Renovação x venda nova:*
• Renovação (CS): 392 vendas (31,4%) | Contra julho: 446 (30,4%) → -12,1%
• Venda nova (demais áreas): 857 vendas (68,6%) | Contra julho: 1.021 (69,6%) → *-16,1%*
  A base de venda nova caiu mais rápido que a renovação — a recorrência está segurando o resultado.

*Reembolso e chargeback (status: VALIDADO — mesma base gerencial de 1.249, sem misturar universo):*
• Ainda pagas: 1.249 | R$ 182.103,89
• Reembolsadas: 154 | R$ 31.962,80
  Contra julho (163 / R$ 42.676,19): -5,5% em quantidade, *-25,1% em valor*
• Chargeback: 3 | R$ 1.188,55
  Contra julho (10 / R$ 2.874,81): -70,0% em quantidade, -58,7% em valor

*Taxa de retorno (reembolso+chargeback) sobre vendas aprovadas:* 11,17% em quantidade (era 10,55% em julho, *piora de 0,6 p.p.*) e 15,42% em valor (era 17,69% em julho, *melhora de 2,27 p.p.*). Comportamento misto: mais vendas pequenas voltando, mas o valor total devolvido caiu — o ticket do que retorna está menor.

*Por área (status: VALIDADO):*

• *CS (renovação):* 392 vendas / R$ 67.808,00 | Contra julho (446 / R$ 74.749,54): -12,1%/-9,3%
• *Comercial: 257 vendas / R$ 42.714,04 — CRESCEU* | Contra julho (208 / R$ 33.148,17): *+23,6%/+28,9%*
• *Parceiros:* 455 vendas / R$ 34.686,86 | Contra julho (609 / R$ 46.787,02): -25,3%/-25,9%
• *Marketing:* 134 vendas / R$ 32.795,18 | Contra julho (189 / R$ 51.612,61): -29,1%/*-36,5%*
• *Comercial Híbrido:* 11 vendas / R$ 4.099,81 (estável)

*Achado central:* o time comercial (venda direta) NÃO é o problema — cresceu. A queda inteira vem de Marketing (-R$ 18.817) e Parceiros (-R$ 12.100). Status: *INVESTIGAR* — causa raiz não está nos dados aqui; abrir por campanha/parceiro antes de cortar orçamento.

*Concentração de clientes (Kiwify):* os 10 maiores compradores de agosto somam ~R$ 10.522 (5,8% da receita) — base bem diluída, sem risco de concentração como o visto no Mabang (ver Parte 3).

_(continua na parte 2/5 — Mabang, margem e canal)_`,
  `📊 *FECHAMENTO EXECUTIVO SABR — AGOSTO/2026 (v5)*
*Parte 2/5 — Mabang: Global, margem e canal*

━━━━━━━━━━━━━━━━━
*2. MABANG — GLOBAL SABR*
━━━━━━━━━━━━━━━━━
_(Nacional + Híbrido + Jonh Variedades, sem duplicidade)_

• 23.150 pedidos | *R$ 847.607,08*
• Meta: 49.000 / R$ 2.140.000 → *47,2% / 39,6%* da meta
• Contra julho (23.394 / R$ 950.267,90): -1,0% pedidos, *-10,8% receita*
• Ticket médio: R$ 36,61 (era R$ 40,62, -9,9%)

*Composição (status: VALIDADO — soma exata):*
• *Nacional:* 20.341 ped. / R$ 675.114,78 | Contra julho (21.724 / R$ 811.100,18): *-6,4%/-16,8%*
• *Híbrido:* 2.138 ped. / R$ 138.461,54 | Contra julho (1.214 / R$ 120.520,74): +76,1%/+14,9% (parte é correção de classificação → *DIVERGÊNCIA EXPLICADA*)
• *Jonh Variedades:* 671 ped. / R$ 34.030,76 | Contra julho (456 / R$ 18.646,98): +47,1%/+82,5% | margem 11,7%→23,3%

*Kaiross (fora do Global):* 1.003 ped. / R$ 120.872,16 | Contra julho (613 / R$ 79.725,19): *+63,6%/+51,6%* — melhor mês

*Margem bruta Nacional+Híbrido — status: INVESTIGAR (cobertura de custo parcial):*
• Agosto: receita de produto R$ 727.062,29 | custo R$ 486.815,40 | lucro bruto *R$ 240.246,89* | margem *33,05%*
• Julho: receita de produto R$ 850.806,63 | custo R$ 534.052,24 | lucro bruto R$ 316.754,39 | margem 37,23%
• *Margem caiu 4,18 p.p.* e lucro bruto caiu R$ 76.507,50 (-24,2%) — pior que a queda de receita (-10,8%), sinal de mix ou custo piorando, não só volume.
_Ressalva: "receita de produto" (preço de item) é R$ 86.514,03 menor que a receita de pedido (R$ 813.576,32) porque não inclui frete/taxa do pedido — margem é sobre produto, não pedido inteiro. 2.578 de 29.708 itens (8,7%) não têm custo cadastrado em agosto (7,0% em julho); a margem real pode estar levemente distorcida por essa lacuna._

*Canal — onde a receita do Nacional caiu (status: VALIDADO, soma bate R$ 675.114,78 exato):*
• *Shopee: R$ 300.302,76* | Contra julho (R$ 453.202,64): *-33,7% — maior queda isolada do mês*
• Mercado Livre: R$ 182.916,19 | Contra julho (R$ 167.939,35): +8,9%
• Manual: R$ 64.666,18 | Contra julho (R$ 39.780,91): +62,6%
• Shopify: R$ 45.961,95 | Contra julho (R$ 56.932,61): -19,3%
• TikTok Shop: R$ 41.756,71 | Contra julho (R$ 35.818,60): +16,6%
• Yampi: R$ 24.827,20 | Contra julho (R$ 30.335,12): -18,2%
• Amazon (via Bling): R$ 8.324,66 | Contra julho (R$ 12.183,32): -31,7%
• TikTok Shop (via Bling): R$ 4.539,20 | Contra julho (R$ 12.987,61): -65,0%
• NuvemShop + Bling V3: R$ 1.819,93 (residual)

*Achado central:* a queda do Nacional inteira é explicada por Shopee (-R$ 152.899,88) — os outros canais no total CRESCERAM (+R$ 16.914,52). Sem Shopee, o Nacional teria crescido. Prioridade #1 pra investigar antes de qualquer decisão sobre Nacional como um todo.

_(continua na parte 3/5 — cancelamentos e SLA)_`,
  `📊 *FECHAMENTO EXECUTIVO SABR — AGOSTO/2026 (v5)*
*Parte 3/5 — Cancelamentos e SLA*

━━━━━━━━━━━━━━━━━
*3. CANCELAMENTOS COMERCIAIS (Mabang)*
━━━━━━━━━━━━━━━━━

• 225 cancelamentos | R$ 14.959,87 (1,0% dos pedidos válidos)
• Contra julho (437 / R$ 28.798,60): *-48,5% em quantidade*
• (247 cancelamentos técnicos da migração Jonh ficam fora dessa conta)

*Achado forte — concentração extrema:*
*216 dos 225 (96,0%) vêm de UM único cliente Híbrido: sunkids2019* (integração #23539, Nuvemshop).
• Desses 216: *144 (64% do total do mês)* têm motivo explícito "sem estoque"
• Os outros 72 vêm só como "cliente ciente" — *INVESTIGAR se é a mesma causa*
Os 9 restantes (4%) são dispersos: 5 solicitação do cliente, 2 reemissão de NF, 1 falta de estoque de outro lojista, 1 via Mercado Livre.

*Por que essa dimensão de cliente importa:* compare com a Parte 1 — a Kiwify não tem nenhum cliente concentrando risco (top 10 = 5,8% da receita). No Mabang Híbrido, 1 cliente sozinho já é 96% de todo o cancelamento comercial do mês. É risco concentrado, não sistêmico.

*Decisão:* conversa direta com sunkids2019 ou revisão do SLA de sincronização de estoque dessa integração, antes de tratar como problema geral do SABR.

_(Concentração de cliente por faturamento no Mabang de canais marketplace — Shopee, ML, etc. — não é confiável hoje: esses pedidos não têm um ID de comprador persistente e rastreável entre pedidos no Mabang. Só é possível com confiança no canal Loja Própria/Híbrido, que é justamente onde já identificamos o caso sunkids2019.)_

━━━━━━━━━━━━━━━━━
*4. SENTINEL — SLA E ATRASOS*
━━━━━━━━━━━━━━━━━
_(regra oficial: pago até 13h BRT despacha no mesmo dia; domingo não é dia operacional)_

• Coorte: 22.359 pedidos | *96,7% no prazo*, 700 com atraso (3,1%)
• Contra julho (86,5% no prazo, 3.046 com atraso — 13,5%): *+10,2 p.p. no prazo*

*Pendências abertas AGORA (P0): 21 pedidos*
• *Maior atraso: 6 dias*, empatado em 3 pedidos: Shopee 22132, Shopee 5437 e LojaPropria 22614
• *Causa determinística:*
  - 11 (52%) — *OPERAÇÃO*: produto existe, é fila de expedição
  - 9 (43%) — *ESTOQUE*: item sem estoque suficiente
  - 1 (5%) — *SISTEMA_MABANG*: sem dado de estoque pra classificar

*Ação por prioridade:* 11 de operação primeiro (resolve em horas), depois 9 de estoque, investigar à parte o 1 caso de dado ausente.

_(continua na parte 4/5 — estoque, visão financeira e meta)_`,
  `📊 *FECHAMENTO EXECUTIVO SABR — AGOSTO/2026 (v5)*
*Parte 4/5 — Estoque, visão financeira e meta*

━━━━━━━━━━━━━━━━━
*5. ATLAS — ESTOQUE E CAPITAL*
━━━━━━━━━━━━━━━━━

• 2.778 SKUs monitorados
• 138 com estoque zero/negativo e venda recente (era 137)
• 87 pra liquidação | 313 sem custo confiável
• Valor de estoque com custo conhecido: *R$ 2.241.700,08* (-R$ 33 mil, giro normal)

*Top 5 SKUs em ruptura ativa:*
1. SAD14147 — Limpador de Vidros Magnético — estoque -1, vende 859un/mês
2. SAD13724 — Mini Batedor Mixer Portátil — estoque 35 (2,6 dias)
3. SAD013576 — Fatiador Manual de Legumes 3 em 1 — estoque 49 (3,7 dias)
4. SAD011626 — Robô Aspirador de Pó — estoque 87 (7,5 dias)
5. SAD009076 — Mini Aspirador Automotivo — estoque 91 (8,3 dias)

*Decisão ATLAS (mantida):* nenhuma compra/liquidação automática. Faltam estoque reservado, trânsito e compras abertas.

━━━━━━━━━━━━━━━━━
*6. VISÃO FINANCEIRA CONSOLIDADA — status: DECLARAÇÃO EXPLÍCITA (AXIOM)*
━━━━━━━━━━━━━━━━━

• Mabang (Global SABR): R$ 847.607,08
• Kiwify (assinaturas/vendas): R$ 182.103,89
• Kaiross (operação própria): R$ 120.872,16
*Soma bruta de escala: R$ 1.150.583,13*

_Isso NÃO é um "faturamento único SABR" — são 3 operações com régua de meta própria e sem overlap conhecido entre si (Kaiross e Kiwify nunca somam ao Mabang). A soma serve só pra dar noção de escala total monitorada, nunca pra decisão isolada. Não existe hoje uma meta oficial "SABR total" que junte as três._

━━━━━━━━━━━━━━━━━
*7. TAMANHO DO GAP PARA A META*
━━━━━━━━━━━━━━━━━

• *Mabang: faltam R$ 1.292.392,92* pra bater a meta de R$ 2.140.000 (atingiu 39,6%)
• *Kiwify: faltam R$ 112.896,11* pra bater a meta de R$ 295.000 (atingiu 61,7%)

O gap do Mabang é 11,4x maior que o da Kiwify em valor absoluto — é ali que uma ação de recuperação tem mais impacto no resultado do mês.

_(continua na parte 5/5 — conclusão e plano de ação)_`,
  `📊 *FECHAMENTO EXECUTIVO SABR — AGOSTO/2026 (v5)*
*Parte 5/5 — Conclusão e plano de ação*

━━━━━━━━━━━━━━━━━
*8. CONCLUSÃO EXECUTIVA*
━━━━━━━━━━━━━━━━━

1️⃣ Vendas Kiwify caíram, mas não por falha do comercial — Comercial cresceu +28,9%. A queda é Marketing e Parceiros.
2️⃣ Nacional caiu -16,8% quase inteiramente por causa do Shopee (-33,7%) — os outros canais juntos cresceram.
3️⃣ Margem bruta Nacional+Híbrido caiu 4,2 p.p. (33,1%, era 37,2%) — pior que a queda de receita, sinal de mix/custo, não só volume.
4️⃣ Cancelamentos concentrados em 1 cliente (sunkids2019, 96% do total) — resolver na origem.
5️⃣ SLA melhorou de verdade (86,5%→96,7%), só 21 pendências hoje, maioria resolve rápido.
6️⃣ Reembolso/chargeback: comportamento misto — piora de 0,6 p.p. em quantidade, melhora de 2,3 p.p. em valor.
7️⃣ Jonh Variedades e Kaiross foram os destaques do mês — cresceram em volume, receita, e Jonh também em margem.
8️⃣ Gap pra meta: faltam R$ 1,29 milhão no Mabang e R$ 112,9 mil na Kiwify — o Mabang é onde a recuperação tem mais impacto.

━━━━━━━━━━━━━━━━━
*9. PLANO DE AÇÃO — SETEMBRO*
━━━━━━━━━━━━━━━━━

*P0 — Hoje:*
• 11 pedidos atrasados por operação → Expedir → Operação
• Ruptura sunkids2019 (96% dos cancelamentos) → Contatar cliente + revisar sync de estoque → Operação/TI
• 5 SKUs em ruptura ativa (top 5 da Parte 4) → Conferir reservado + trânsito + compra aberta → Compras

*P1 — 48h:*
• Shopee -33,7% no Nacional → Investigar causa (política, ads, catálogo) → Comercial/Marketplace
• Marketing Kiwify -36,5% receita → Abrir por campanha/origem → Marketing
• Parceiros Kiwify -25,9% → Abrir por parceiro individual → Comercial

*P1 — Semana:*
• Margem Global caiu 4,2 p.p. → Investigar custo/mix por categoria → Compras/Financeiro
• 9 pedidos atrasados por falta de estoque → Repor conforme prioridade → Compras

*P2 — Semana:*
• 313 SKUs sem custo confiável + 2.578 itens de pedido sem custo (8,7%) → Sanear cadastro de custo → Cadastro/Compras
• 72 cancelamentos "cliente ciente" sem motivo explícito → Confirmar se é mesma causa de estoque do sunkids2019 → Operação

Isso deixa de ser só "o que aconteceu em agosto" e passa a responder "o que a SABR faz em setembro por causa disso".

— *SABR Intelligence Office* (AXIOM · SENTINEL · ATLAS)`,
];

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
    const supportedTypes = new Set(["text", "button", "interactive", "image", "audio", "video", "document", "sticker", "location", "voice"]);

    const nomesPorNumero = new Map<string, string>();
    for (const contato of value.contacts ?? []) {
      const nome = contato.profile?.name?.trim();
      if (contato.wa_id && nome) nomesPorNumero.set(contato.wa_id, nome);
    }

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
      } else if (message.type === "button") {
        // Resposta rápida de um template aprovado da Meta.
        text = message.button?.text ?? message.button?.payload ?? "";
      } else if (message.type === "interactive") {
        // Compatibilidade com botões/listas enviados como mensagem interativa.
        text =
          message.interactive?.button_reply?.title ??
          message.interactive?.button_reply?.id ??
          message.interactive?.list_reply?.title ??
          message.interactive?.list_reply?.id ??
          "";
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
          name: nomesPorNumero.get(fromNumber) ?? `Lead ${fromNumber}`,
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

      // O botão do template atlas_relatorio_disponivel pode chegar como
      // `button`, `interactive` ou texto, conforme o tipo de mensagem da Meta.
      // Encaminhamos o pedido ao workflow permanente do n8n para responder
      // dentro da janela de atendimento aberta pelo usuário.
      const normalizedText = text.trim().toLocaleLowerCase();
      if (normalizedText === "receber relatório" || normalizedText === "receber relatorio") {
        const atlasWebhook = process.env.ATLAS_REPORT_WEBHOOK_URL;
        if (atlasWebhook) {
          // Envia as partes em sequência, não em paralelo — o WhatsApp não
          // garante ordem de entrega de mensagens disparadas ao mesmo tempo,
          // e o relatório só faz sentido lido na ordem (parte 1 -> 5).
          for (const parte of MONTHLY_REPORT_PARTS) {
            try {
              await fetch(atlasWebhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tenant_id: tenantId, destinatario: fromNumber, conteudo: parte, agente: "AXIOM" }),
                signal: AbortSignal.timeout(15_000),
              });
            } catch (error) {
              console.error("ATLAS report webhook error:", error);
            }
          }
        }
      }

      // Botão do template de alerta de compra urgente (SENTINEL). Diferente
      // do webhook do ATLAS, este exige segredo compartilhado — o n8n
      // rejeita a chamada sem o header correto.
      if (normalizedText === "ver pedidos sem estoque") {
        const sentinelWebhook = process.env.SENTINEL_REPORT_WEBHOOK_URL;
        const sentinelSecret = process.env.SENTINEL_REPORT_WEBHOOK_SECRET;
        if (sentinelWebhook && sentinelSecret) {
          try {
            await fetch(sentinelWebhook, {
              method: "POST",
              headers: { "Content-Type": "application/json", authorization: `Bearer ${sentinelSecret}` },
              body: JSON.stringify({ tenant_id: tenantId, destinatario: fromNumber, agente: "SENTINEL" }),
              signal: AbortSignal.timeout(15_000),
            });
          } catch (error) {
            console.error("SENTINEL report webhook error:", error);
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
