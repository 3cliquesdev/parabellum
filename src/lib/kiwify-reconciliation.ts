import type { AdminClient } from "@/lib/auth/guard";
import { escolherVendedorMenosCarregado } from "@/lib/negocios/distribuicao";
import { registrarEventoNegocio } from "@/lib/negocios/eventos";
import { resolvePipelinePadrao } from "@/lib/negocios/pipeline-padrao";
import { sendMail } from "@/lib/mailer";
import { phoneSuffix8 } from "@/lib/inbox/channels";

const CONFIRMACAO_JANELA_MINUTOS = 30;

type LeadForReconciliation = {
  id: string;
  tenant_id: string;
  nome: string | null;
  whatsapp: string | null;
  email: string | null;
  cpf: string | null;
  endereco_rua: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
  endereco_bairro: string | null;
  endereco_cidade: string | null;
  endereco_estado: string | null;
  endereco_cep: string | null;
  eh_cliente: boolean;
};

type KiwifySale = {
  id: string;
  lead_id: string | null;
  produto_nome: string;
  valor: number;
  buyer_phone_normalized: string | null;
  buyer_email_normalized: string | null;
  buyer_cpf_normalized: string | null;
  raw_payload: Record<string, unknown> | null;
};

export type ReconcileKiwifyResult = {
  matched: boolean;
  conflict: boolean;
  linkedSales: number;
};

function digits(value: string | null | undefined) {
  const result = value?.replace(/\D/g, "") ?? "";
  return result.startsWith("55") && result.length > 11 ? result.slice(2) : result;
}

function email(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function customerFromPayload(payload: Record<string, unknown> | null) {
  const root = payload ?? {};
  const customer = (root.Customer ?? root.customer ?? root) as Record<string, unknown>;
  const read = (...keys: string[]) => {
    for (const key of keys) {
      const value = customer[key] ?? root[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return null;
  };
  return {
    nome: read("full_name", "name"), email: read("email"), cpf: read("CPF", "cpf"),
    endereco_rua: read("street"), endereco_numero: read("number"), endereco_complemento: read("complement"),
    endereco_bairro: read("neighborhood"), endereco_cidade: read("city"), endereco_estado: read("state"), endereco_cep: read("zipcode"),
  };
}

async function activityExists(admin: AdminClient, leadId: string, marker: string) {
  const { data } = await admin.from("atividades").select("id").eq("lead_id", leadId)
    .eq("titulo", "Kiwify — vinculação silenciosa").ilike("descricao", `%${marker}%`).limit(1).maybeSingle();
  return Boolean(data);
}

async function registerTimeline(admin: AdminClient, tenantId: string, leadId: string, sale: KiwifySale) {
  const marker = `venda_id=${sale.id}`;
  if (await activityExists(admin, leadId, marker)) return;
  await admin.from("atividades").insert({
    tenant_id: tenantId, lead_id: leadId, tipo: "outro", titulo: "Kiwify — vinculação silenciosa",
    descricao: `${marker}; produto=${sale.produto_nome}; valor=R$ ${Number(sale.valor ?? 0).toFixed(2)}; compra paga vinculada automaticamente.`,
    concluida: true, concluida_em: new Date().toISOString(),
  });
}

// Avisa o vendedor responsavel que uma venda Kiwify casou com um negocio que
// ele ja esta trabalhando, e que ele tem 30min pra confirmar o ID da venda
// antes do sistema fechar sozinho (ver src/app/api/negocios/kiwify-pendentes).
async function notificarConfirmacaoPendente(admin: AdminClient, tenantId: string, leadId: string, negocioId: string, vendedorId: string | null, sale: KiwifySale) {
  await admin.from("atividades").insert({
    tenant_id: tenantId, lead_id: leadId, tipo: "outro", titulo: "Confirmar venda Kiwify",
    descricao: `Pagamento Kiwify recebido (produto=${sale.produto_nome}; valor=R$ ${Number(sale.valor ?? 0).toFixed(2)}; venda_id=${sale.id}). Confirme o ID da venda em até ${CONFIRMACAO_JANELA_MINUTOS} minutos ou o negócio fecha automaticamente como Ganho.`,
    concluida: false,
  });
  if (!vendedorId) return;
  const { data } = await admin.auth.admin.getUserById(vendedorId);
  const emailVendedor = data.user?.email;
  if (!emailVendedor) return;
  await sendMail({
    to: emailVendedor,
    subject: "Confirme a venda Kiwify pra fechar esse negócio",
    html: `<p>O lead do seu negócio (ID ${negocioId}) pagou pela Kiwify: <strong>${sale.produto_nome}</strong>, R$ ${Number(sale.valor ?? 0).toFixed(2)}.</p>
      <p>Confirme o ID da venda (${sale.id}) no CRM em até ${CONFIRMACAO_JANELA_MINUTOS} minutos pra fechar você mesmo — depois disso o sistema fecha automaticamente.</p>`,
  });
}

async function moveToGain(admin: AdminClient, tenantId: string, leadId: string, sale: KiwifySale) {
  const { pipelineId, etapaId } = await resolvePipelinePadrao(admin, tenantId);
  if (!pipelineId) return;
  const { data: wonStage } = await admin.from("pipeline_etapas").select("id").eq("pipeline_id", pipelineId)
    .eq("e_ganho", true).limit(1).maybeSingle();
  const stageId = (wonStage as { id: string } | null)?.id ?? etapaId;
  if (!stageId) return;

  const { data: open } = await admin.from("negocios").select("id, pipeline_etapa_id, assigned_to")
    .eq("lead_id", leadId).eq("estagio", "aberto").order("created_at", { ascending: true }).limit(1).maybeSingle();
  const openBusiness = open as { id: string; pipeline_etapa_id: string | null; assigned_to: string | null } | null;
  if (openBusiness) {
    // Nao fecha na hora: fica em aberto aguardando o vendedor confirmar o ID
    // da venda (ou o timeout de 30min mover sozinho) - ver plano/dividas.
    await admin.from("negocios").update({
      valor: sale.valor, canal: "kiwify", origem: "kiwify_auto",
      aguardando_confirmacao_kiwify_em: new Date().toISOString(), venda_id_sugerida: sale.id,
      updated_at: new Date().toISOString(),
    }).eq("id", openBusiness.id);
    await notificarConfirmacaoPendente(admin, tenantId, leadId, openBusiness.id, openBusiness.assigned_to, sale);
    return;
  }

  const { data: existingWon } = await admin.from("negocios").select("id").eq("lead_id", leadId).eq("estagio", "ganho").limit(1).maybeSingle();
  if (existingWon) return;
  const assignedTo = await escolherVendedorMenosCarregado(admin, pipelineId);
  const { data: created } = await admin.from("negocios").insert({ tenant_id: tenantId, lead_id: leadId, titulo: sale.produto_nome, valor: sale.valor, canal: "kiwify", estagio: "ganho", origem: "kiwify_auto", pipeline_id: pipelineId, pipeline_etapa_id: stageId, assigned_to: assignedTo, venda_id: sale.id }).select("id").single();
  const businessId = (created as { id: string } | null)?.id;
  if (businessId) await registrarEventoNegocio(admin, { negocioId: businessId, tenantId, tipo: "ganho", etapaNovaId: stageId, origem: "kiwify_reconciliation" });
}

export async function reconcileLeadWithKiwify(
  admin: AdminClient,
  tenantId: string,
  leadId: string,
  options?: { triggeredSaleId?: string | null },
): Promise<ReconcileKiwifyResult> {
  const { data: leadData } = await admin.from("leads").select("id, tenant_id, nome, whatsapp, email, cpf, endereco_rua, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep, eh_cliente").eq("tenant_id", tenantId).eq("id", leadId).maybeSingle();
  const lead = leadData as LeadForReconciliation | null;
  if (!lead) return { matched: false, conflict: false, linkedSales: 0 };

  const phoneSuffix = phoneSuffix8(lead.whatsapp);
  const leadEmail = email(lead.email);
  const cpf = digits(lead.cpf);
  const filters = [`lead_id.eq.${leadId}`];
  if (phoneSuffix) filters.push(`buyer_phone_normalized.ilike.%${phoneSuffix}`);
  if (leadEmail) filters.push(`buyer_email_normalized.eq.${leadEmail}`);
  if (cpf) filters.push(`buyer_cpf_normalized.eq.${cpf}`);

  const { data } = await admin.from("vendas").select("id, lead_id, produto_nome, valor, buyer_phone_normalized, buyer_email_normalized, buyer_cpf_normalized, raw_payload")
    .eq("tenant_id", tenantId).in("origem", ["kiwify", "kiwify_lovable"]).eq("status", "pago").or(filters.join(","));
  const sales = (data ?? []) as KiwifySale[];
  if (sales.length === 0) return { matched: false, conflict: false, linkedSales: 0 };

  const conflicting = sales.filter((sale) => sale.lead_id && sale.lead_id !== leadId);
  if (conflicting.length > 0) {
    const marker = `conflito_vendas=${conflicting.map((sale) => sale.id).sort().join(",")}`;
    if (!await activityExists(admin, leadId, marker)) {
      await admin.from("atividades").insert({ tenant_id: tenantId, lead_id: leadId, tipo: "outro", titulo: "Conflito de identidade Kiwify", descricao: `${marker}; nenhuma vinculação automática foi feita.`, concluida: false });
    }
    return { matched: false, conflict: true, linkedSales: 0 };
  }

  const unlinkedIds = sales.filter((sale) => !sale.lead_id).map((sale) => sale.id);
  if (unlinkedIds.length) await admin.from("vendas").update({ lead_id: leadId }).in("id", unlinkedIds);

  const customer = customerFromPayload(sales[0].raw_payload);
  const updates: Record<string, string | boolean> = { eh_cliente: true, status: "ganho" };
  const fill = (column: keyof LeadForReconciliation, value: string | null) => { if (!lead[column] && value) updates[column] = value; };
  fill("nome", customer.nome); fill("email", customer.email); fill("cpf", customer.cpf ? digits(customer.cpf) : null);
  fill("endereco_rua", customer.endereco_rua); fill("endereco_numero", customer.endereco_numero); fill("endereco_complemento", customer.endereco_complemento); fill("endereco_bairro", customer.endereco_bairro); fill("endereco_cidade", customer.endereco_cidade); fill("endereco_estado", customer.endereco_estado); fill("endereco_cep", customer.endereco_cep);
  await admin.from("leads").update(updates).eq("id", leadId);

  const primarySale = sales.find((sale) => sale.id === options?.triggeredSaleId) ?? sales[0];
  await moveToGain(admin, tenantId, leadId, primarySale);
  const activitySales = options?.triggeredSaleId ? sales.filter((sale) => sale.id === options.triggeredSaleId) : sales.filter((sale) => unlinkedIds.includes(sale.id));
  if (activitySales.length) await Promise.all(activitySales.map((sale) => registerTimeline(admin, tenantId, leadId, sale)));
  return { matched: true, conflict: false, linkedSales: unlinkedIds.length };
}
