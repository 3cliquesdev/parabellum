import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { LooseDatabase } from "@/types/database";
import { resolveOrLinkLead } from "@/lib/inbox/service";
import { resolvePipelinePadrao } from "@/lib/negocios/pipeline-padrao";
import { escolherVendedorMenosCarregado } from "@/lib/negocios/distribuicao";

function adminClient() {
  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

interface KiwifyCustomer {
  full_name?: string;
  email?: string;
  mobile?: string;
  phone_number?: string;
  CPF?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipcode?: string;
}

interface KiwifyProduct {
  product_id?: string;
  product_name?: string;
  name?: string;
}

interface KiwifyWebhookBody {
  order_id?: string;
  order_status?: string;
  webhook_event_type?: string;
  Customer?: KiwifyCustomer;
  Product?: KiwifyProduct;
  Subscription?: { plan?: { name?: string }; charges?: { completed?: { order_id?: string }[] } };
  Commissions?: { charge_amount?: number; product_base_price?: number };
  charge_amount?: number;
  amount?: number;
  product_type?: string;
}

// O webhook de "carrinho abandonado" da Kiwify manda um formato TOTALMENTE
// diferente do webhook de pedido/pagamento: campos soltos na raiz, sem
// Customer/Product. Sem essa normalizacao, esses eventos caiam como "outro",
// sem produto/valor e sem vincular a nenhum lead (44 casos confirmados).
interface KiwifyAbandonedCartBody {
  id?: string;
  cpf?: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  product_id?: string;
  product_name?: string;
}

function isAbandonedCartShape(raw: unknown): raw is KiwifyAbandonedCartBody {
  const r = raw as Record<string, unknown>;
  return !r.Customer && r.status === "abandoned";
}

function normalizeKiwifyBody(raw: unknown): KiwifyWebhookBody {
  if (isAbandonedCartShape(raw)) {
    return {
      order_id: raw.id,
      order_status: "cart_abandoned",
      Customer: {
        full_name: raw.name,
        email: raw.email,
        mobile: raw.phone,
        CPF: raw.cpf,
      },
      Product: { product_id: raw.product_id, product_name: raw.product_name },
    };
  }
  return raw as KiwifyWebhookBody;
}

// Kiwify manda em Subscription.charges.completed o historico de cobrancas ja
// concluidas daquela assinatura. Se alguma delas tem order_id diferente do
// pedido atual, ja existe um ciclo anterior - o evento atual e renovacao
// (ou tentativa de renovacao, mesmo que tenha falhado). Produto avulso (sem
// Subscription) e sempre "nova" por definicao.
function tipoCobranca(body: KiwifyWebhookBody): "nova" | "renovacao" {
  const completed = body.Subscription?.charges?.completed ?? [];
  const temCicloAnterior = completed.some((c) => c.order_id && c.order_id !== body.order_id);
  return temCicloAnterior ? "renovacao" : "nova";
}

// Valores REAIS de order_status, confirmados no codigo em producao do
// Parabellum (43mil+ eventos processados): 'paid' | 'order_approved' |
// 'subscription_renewed' | 'refused' | 'cart_abandoned' | 'payment_refused' |
// 'subscription_late' | 'subscription_card_declined' | 'refunded' |
// 'chargedback' | 'subscription_canceled'.
const STATUS_MAP: Record<string, string> = {
  paid: "pago",
  order_approved: "pago",
  subscription_renewed: "pago",

  cart_abandoned: "carrinho_abandonado",

  refused: "cartao_recusado",
  payment_refused: "cartao_recusado",

  subscription_late: "aguardando_pagamento",
  subscription_card_declined: "aguardando_pagamento",
  waiting_payment: "aguardando_pagamento",
  pix_created: "aguardando_pagamento",
  billet_created: "aguardando_pagamento",

  refunded: "reembolsado",
  chargedback: "chargeback",
  subscription_canceled: "cancelado",
};

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!process.env.KIWIFY_WEBHOOK_TOKEN || token !== process.env.KIWIFY_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "Token invalido" }, { status: 401 });
  }

  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const rawBody = await request.json().catch(() => ({}));
  const body = normalizeKiwifyBody(rawBody);
  const rawStatus = (body.order_status ?? body.webhook_event_type ?? "").toLowerCase();
  const status = STATUS_MAP[rawStatus] ?? "outro";

  const customer = body.Customer;
  const produtoNome = body.Product?.product_name ?? body.Product?.name ?? body.Subscription?.plan?.name ?? "Produto Kiwify";
  // Kiwify manda o valor em centavos, dentro de Commissions (nao existe charge_amount na raiz).
  const valorCentavos = body.Commissions?.charge_amount ?? body.Commissions?.product_base_price ?? body.charge_amount ?? body.amount ?? 0;
  const valor = valorCentavos / 100;
  // Sinal estrutural (presenca do objeto Subscription) e mais confiavel que o
  // texto livre de product_type pra saber se e venda com ou sem assinatura.
  const tipoProduto = body.Subscription || body.product_type === "subscription" || body.product_type === "membership"
    ? "assinatura"
    : "curso";

  const admin = adminClient();

  // Mesma normalizacao usada em lead_identities/sync_lead_identity_columns: so
  // digitos, sem o 55 do Brasil na frente. Usado pra vinculacao silenciosa
  // telefone <-> cliente Kiwify (ver resolveLead em lib/inbox/service.ts).
  const rawPhone = customer?.mobile ?? customer?.phone_number ?? null;
  let buyerPhoneNormalized: string | null = null;
  if (rawPhone) {
    const digits = rawPhone.replace(/\D/g, "");
    buyerPhoneNormalized = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits || null;
  }

  let leadId: string | null = null;
  if (customer?.email || customer?.mobile || customer?.phone_number) {
    // So vincula/atualiza o lead. Status de pedido nao e mensagem de
    // conversa — nao deve criar/reabrir uma conversa no Inbox como se o
    // cliente tivesse escrito algo (bug real: emails de status da Kiwify
    // apareciam misturados com emails de verdade do cliente).
    const lead = await resolveOrLinkLead(
      admin,
      tenantId,
      { canal: "email", value: customer.email ?? null },
      {
        name: customer.full_name ?? null,
        origem: "kiwify",
        identities: customer.mobile || customer.phone_number
          ? [{ canal: "whatsapp", value: customer.mobile ?? customer.phone_number ?? null }]
          : [],
        extra: {
          cpf: customer.CPF ?? null,
          enderecoRua: customer.street ?? null,
          enderecoNumero: customer.number ?? null,
          enderecoComplemento: customer.complement ?? null,
          enderecoBairro: customer.neighborhood ?? null,
          enderecoCidade: customer.city ?? null,
          enderecoEstado: customer.state ?? null,
          enderecoCep: customer.zipcode ?? null,
        },
      },
    );
    leadId = lead?.id ?? null;
  }

  const tipoCobrancaAtual = tipoCobranca(body);

  const { error } = await admin.from("vendas").upsert({
    tenant_id: tenantId,
    lead_id: leadId,
    produto_nome: produtoNome,
    valor,
    status,
    tipo_produto: tipoProduto,
    tipo_cobranca: tipoCobrancaAtual,
    origem: "kiwify",
    buyer_phone_normalized: buyerPhoneNormalized,
    // Inclui o produto na chave de conflito: um pedido com order bump manda
    // um webhook por produto com o mesmo order_id - sem o product_id aqui, o
    // segundo evento sobrescrevia o primeiro em vez de registrar os dois.
    external_id: body.order_id ? `${body.order_id}:${body.Product?.product_id ?? produtoNome}` : null,
    raw_payload: rawBody,
    paid_at: status === "pago" ? new Date().toISOString() : null,
  }, { onConflict: "tenant_id,origem,external_id" });

  if (error) {
    console.error("kiwify webhook: falha ao salvar venda:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // eh_cliente tambem era setado so por um trigger no banco (AFTER INSERT OR
  // UPDATE OF status em vendas) - um reassign de lead_id (ex: merge de leads
  // duplicados) nao dispara esse trigger, entao um lead podia ficar com uma
  // venda paga vinculada e mesmo assim eh_cliente=false pra sempre (bug real
  // encontrado). Setar direto aqui a cada evento pago remove essa dependencia.
  if (status === "pago" && leadId) {
    await admin.from("leads").update({ eh_cliente: true }).eq("id", leadId).eq("eh_cliente", false);
  }

  // Cliente novo (primeira venda paga, nao renovacao/recompra) vira
  // oportunidade automatica no Pipeline, ja fechada como "ganho" - ele ja
  // pagou, nao precisa passar pelo funil manual. Renovacao ou recompra de
  // quem ja e cliente nao mexe em nada disso (evita ficar "recriando" lead
  // antigo como se fosse novo).
  if (status === "pago" && leadId) {
    const { count } = await admin
      .from("vendas")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", leadId)
      .eq("status", "pago");

    if ((count ?? 0) <= 1) {
      const { pipelineId, etapaId } = await resolvePipelinePadrao(admin, tenantId);
      // Ganho ja e' etapa terminal - busca a etapa marcada e_ganho do
      // pipeline padrao em vez da primeira etapa (que e' "Novo").
      let etapaGanhoId = etapaId;
      if (pipelineId) {
        const { data: etapaGanho } = await admin
          .from("pipeline_etapas")
          .select("id")
          .eq("pipeline_id", pipelineId)
          .eq("e_ganho", true)
          .limit(1)
          .maybeSingle();
        etapaGanhoId = (etapaGanho as { id: string } | null)?.id ?? etapaId;
      }
      // Todo lead ja nasce com um negocio "aberto" no pipeline padrao (ver
      // resolveLead em lib/inbox/service.ts) - move esse negocio existente pra
      // Ganho em vez de criar um segundo card duplicado pro mesmo lead.
      const { data: negocioExistente } = await admin
        .from("negocios")
        .select("id, assigned_to")
        .eq("lead_id", leadId)
        .eq("estagio", "aberto")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      const negocioInfo = negocioExistente as { id: string; assigned_to: string | null } | null;
      const assignedTo = negocioInfo?.assigned_to ?? (pipelineId ? await escolherVendedorMenosCarregado(admin, pipelineId) : null);

      if (negocioInfo) {
        await admin.from("negocios").update({
          titulo: produtoNome,
          valor,
          canal: "kiwify",
          estagio: "ganho",
          origem: "kiwify_auto",
          pipeline_id: pipelineId,
          pipeline_etapa_id: etapaGanhoId,
          assigned_to: assignedTo,
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", negocioInfo.id);
      } else {
        await admin.from("negocios").insert({
          tenant_id: tenantId,
          lead_id: leadId,
          titulo: produtoNome,
          valor,
          canal: "kiwify",
          estagio: "ganho",
          origem: "kiwify_auto",
          pipeline_id: pipelineId,
          pipeline_etapa_id: etapaGanhoId,
          assigned_to: assignedTo,
        });
      }
      await admin.from("leads").update({ status: "ganho", valor_estimado: valor }).eq("id", leadId);
    }
  }

  // Carrinho abandonado/cartao recusado/aguardando pagamento tambem
  // alimentam o valor estimado do lead (aparece no card do Kanban e soma no
  // funil) - so quando o lead ainda nao tem nenhum valor, nunca sobrescreve.
  // Carrinho abandonado nao manda valor no proprio payload (a Kiwify nao
  // manda esse dado nesse evento) - estima pelo preco mais recente desse
  // mesmo produto em outra venda registrada.
  if (["carrinho_abandonado", "cartao_recusado", "aguardando_pagamento"].includes(status) && leadId) {
    const { data: leadAtual } = await admin.from("leads").select("valor_estimado").eq("id", leadId).maybeSingle();
    const jaTemValor = (leadAtual as { valor_estimado?: number | null } | null)?.valor_estimado;

    if (!jaTemValor) {
      let valorParaLead = valor;
      if (!valorParaLead && body.Product?.product_id) {
        const { data: vendaComparavel } = await admin
          .from("vendas")
          .select("valor")
          .eq("tenant_id", tenantId)
          .eq("raw_payload->Product->>product_id", body.Product.product_id)
          .gt("valor", 0)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        valorParaLead = (vendaComparavel as { valor?: number } | null)?.valor ?? 0;
      }
      if (valorParaLead) {
        await admin.from("leads").update({ valor_estimado: valorParaLead }).eq("id", leadId);
      }
    }
  }

  return NextResponse.json({ ok: true, lead_id: leadId });
}
