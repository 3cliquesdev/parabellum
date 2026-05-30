import { createServerClient } from "@supabase/ssr";
import { GoogleAuth } from "google-auth-library";
import { dispatchConversation } from "@/lib/dispatch";

const VERTEX_PROJECT = "adsliberty";
const VERTEX_LOCATION = "us-central1";

function adminClient() {
  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

// ─── Normalizar texto para matching ───
function normalize(text: string): string {
  return text.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s]/g, "").trim();
}

// ─── Matching de keywords ───
function matchesKeyword(message: string, keyword: string): boolean {
  const msgNorm = normalize(message);
  const kwNorm = normalize(keyword);
  if (!kwNorm) return false;
  return msgNorm.includes(kwNorm) || kwNorm.includes(msgNorm);
}

// ─── Encontrar próximo nó pela edge ───
function nextNode(flowDef: any, currentNodeId: string, handleId: string = "default"): any | null {
  const nodes: any[] = flowDef.nodes ?? [];
  const edges: any[] = flowDef.edges ?? [];
  const edge = edges.find(e => e.source === currentNodeId && (e.sourceHandle === handleId || (!e.sourceHandle && handleId === "default")));
  if (!edge) return null;
  return nodes.find(n => n.id === edge.target) ?? null;
}

// ─── Detect intent from AI reply ───
async function detectIntentFromReply(reply: string, userMessage: string): Promise<string> {
  const text = (reply + " " + userMessage).toLowerCase();
  if (/(não sei|não consigo|desculpe|não tenho essa informação|vou encaminhar)/.test(text)) return "nao_sei";
  if (/(humano|atendente|pessoa|falar com alguém|suporte humano)/.test(normalize(userMessage))) return "humano";
  if (/(problema|erro|quebrado|não funciona|bug|defeito)/.test(normalize(userMessage))) return "suporte";
  if (/(preço|valor|comprar|contratar|proposta|plano)/.test(normalize(userMessage))) return "comercial";
  return "resolvido";
}

// ─── Chamar Gemini com contexto do flow ───
async function callGeminiFlow(node: any, state: any, lead: any, tenantId: string, userMessage: string): Promise<{ reply: string; intent: string }> {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
    const auth = new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
    const client = await auth.getClient();
    const token = (await client.getAccessToken()).token!;

    const supabase = adminClient();

    // Buscar persona
    const { data: persona } = await supabase.from("personas").select("*").eq("tenant_id", tenantId).eq("ativo", true).order("created_at").limit(1).single() as { data: any };

    // Buscar KB se habilitado
    let kbContext = "";
    if (node.data.usar_kb && process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      try {
        const embedRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://liberty-crm-six.vercel.app"}/api/ai/embed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: userMessage }),
        });
        if (embedRes.ok) {
          const { embedding } = await embedRes.json();
          if (embedding?.length > 0) {
            const { data: kbResults } = await supabase.rpc("buscar_conhecimento", {
              p_tenant_id: tenantId,
              query_embedding: `[${embedding.join(",")}]`,
              match_count: 3,
              threshold: 0.55,
            });
            if ((kbResults ?? []).length > 0) {
              kbContext = `\n\nCONHECIMENTO DISPONÍVEL:\n${(kbResults as any[]).map((a: any) => `[${a.categoria}] ${a.titulo}: ${a.conteudo}`).join("\n\n")}`;
            }
          }
        }
      } catch { /* kb optional */ }
    }

    // Dados coletados no flow
    const collectedStr = Object.keys(state.collected_data ?? {}).length > 0
      ? `\n\nDADOS DO LEAD NO FLOW:\n${JSON.stringify(state.collected_data, null, 2)}`
      : "";

    // Contexto do nó
    const nodeContext = node.data.context_prompt ? `\n\nINSTRUÇÕES ESPECÍFICAS: ${node.data.context_prompt}` : "";
    const maxTentativas = node.data.max_tentativas ?? 3;
    const tentativasRestantes = maxTentativas - (state.tentativas_ia ?? 0);

    const systemPrompt = `${persona?.descricao ?? "Você é um assistente especializado."} Lead: ${lead?.nome ?? "Desconhecido"}.${kbContext}${collectedStr}${nodeContext}

INSTRUÇÕES DO FLUXO:
- Tente resolver o problema do lead.
- Se conseguir resolver completamente, inclua "RESOLVIDO:" no início da sua resposta.
- Se não souber responder, diga claramente que vai encaminhar para um especialista.
- Seja breve e objetivo.
- Tentativas restantes: ${tentativasRestantes} de ${maxTentativas}.
- Responda em português.`;

    const url = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT}/locations/${VERTEX_LOCATION}/publishers/google/models/gemini-2.0-flash:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemPrompt }] },
          { role: "model", parts: [{ text: "Entendido!" }] },
          { role: "user", parts: [{ text: userMessage }] },
        ],
        generationConfig: { maxOutputTokens: persona?.max_tokens ?? 300, temperature: persona?.temperatura ?? 0.7 },
      }),
    });

    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const intent = await detectIntentFromReply(reply, userMessage);

    // Se atingiu max_tentativas e não resolveu → forçar nao_sei
    if ((state.tentativas_ia ?? 0) + 1 >= maxTentativas && intent !== "resolvido") {
      return { reply, intent: "nao_sei" };
    }

    return { reply, intent };
  } catch (err) {
    console.error("Flow Gemini error:", err);
    return { reply: "Desculpe, ocorreu um erro. Vou encaminhar para nossa equipe.", intent: "nao_sei" };
  }
}

// ─── Enviar mensagem ───
async function sendFlowMessage(tenantId: string, conversaId: string, text: string, accessToken: string, phoneNumberId: string, toNumber: string) {
  const supabase = adminClient();
  await supabase.from("mensagens").insert({
    conversa_id: conversaId, tenant_id: tenantId, remetente: "ia",
    conteudo: text, enviada: false,
  });
  await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to: toNumber, type: "text", text: { body: text } }),
  });
  await supabase.from("mensagens").update({ enviada: true }).eq("conversa_id", conversaId).eq("remetente", "ia").eq("enviada", false);
  await supabase.from("conversas").update({ updated_at: new Date().toISOString() }).eq("id", conversaId);
}

// ─── Interface principal do motor ───
export async function processFlowMessage(params: {
  tenantId: string;
  conversaId: string;
  leadId: string;
  lead: any;
  text: string;
  accessToken: string;
  phoneNumberId: string;
  toNumber: string;
}): Promise<"done" | "waiting" | null> {
  const supabase = adminClient();

  // 1. Verificar fluxo ativo
  const { data: activeState } = await supabase.from("chat_flow_states")
    .select("*, chat_flows(*)").eq("conversa_id", params.conversaId)
    .in("status", ["ativo", "aguardando"]).order("started_at", { ascending: false }).limit(1).single() as { data: any };

  if (activeState) {
    return await continueFlow(activeState, params);
  }

  // 2. Verificar se mensagem ativa algum fluxo
  const { data: flows } = await supabase.from("chat_flows")
    .select("*").eq("tenant_id", params.tenantId).eq("ativo", true)
    .order("prioridade", { ascending: false });

  for (const flow of flows ?? []) {
    const keywords: string[] = flow.trigger_keywords ?? [];
    if (keywords.some(kw => matchesKeyword(params.text, kw))) {
      return await startFlow(flow, params);
    }
  }

  return null; // Nenhum flow ativo — usa IA padrão
}

// ─── Iniciar fluxo ───
async function startFlow(flow: any, params: any): Promise<"done" | "waiting" | null> {
  const supabase = adminClient();
  const flowDef = flow.flow_definition ?? { nodes: [], edges: [] };
  const startNode = flowDef.nodes.find((n: any) => n.type === "start") ?? flowDef.nodes[0];
  if (!startNode) return null;

  const firstNode = nextNode(flowDef, startNode.id, "default");
  if (!firstNode) return null;

  // Criar estado do fluxo
  const { data: state } = await supabase.from("chat_flow_states").insert({
    tenant_id: params.tenantId, conversa_id: params.conversaId,
    flow_id: flow.id, current_node_id: firstNode.id,
    status: "ativo", collected_data: {}, tentativas_ia: 0,
  }).select().single() as { data: any };

  return await executeNode(firstNode, { ...state, chat_flows: flow }, params, flowDef);
}

// ─── Continuar fluxo ───
async function continueFlow(state: any, params: any): Promise<"done" | "waiting" | null> {
  const supabase = adminClient();
  const flowDef = state.chat_flows?.flow_definition ?? { nodes: [], edges: [] };
  const currentNode = flowDef.nodes.find((n: any) => n.id === state.current_node_id);
  if (!currentNode) return null;

  // Se está aguardando input — processar resposta do lead
  if (state.status === "aguardando") {
    await supabase.from("chat_flow_states").update({ status: "ativo" }).eq("id", state.id);
    return await handleNodeInput(currentNode, state, params, flowDef);
  }

  return await executeNode(currentNode, state, params, flowDef);
}

// ─── Executar nó ───
async function executeNode(node: any, state: any, params: any, flowDef: any): Promise<"done" | "waiting" | null> {
  const supabase = adminClient();

  switch (node.type) {
    case "message": {
      await sendFlowMessage(params.tenantId, params.conversaId, node.data.text ?? "", params.accessToken, params.phoneNumberId, params.toNumber);
      const next = nextNode(flowDef, node.id, "default");
      if (!next) { await completeFlow(state, "concluido"); return "done"; }
      await supabase.from("chat_flow_states").update({ current_node_id: next.id }).eq("id", state.id);
      return await executeNode(next, state, params, flowDef);
    }

    case "ask": {
      await sendFlowMessage(params.tenantId, params.conversaId, node.data.question ?? "Como posso ajudar?", params.accessToken, params.phoneNumberId, params.toNumber);
      await supabase.from("chat_flow_states").update({ status: "aguardando", current_node_id: node.id }).eq("id", state.id);
      return "waiting";
    }

    case "ai_response": {
      const { reply, intent } = await callGeminiFlow(node, state, params.lead, params.tenantId, params.text);
      const cleanReply = reply.replace(/^RESOLVIDO:\s*/i, "");
      await sendFlowMessage(params.tenantId, params.conversaId, cleanReply, params.accessToken, params.phoneNumberId, params.toNumber);
      await supabase.from("chat_flow_states").update({ tentativas_ia: (state.tentativas_ia ?? 0) + 1 }).eq("id", state.id);

      const next = nextNode(flowDef, node.id, intent) ?? nextNode(flowDef, node.id, "default");
      if (!next) { await completeFlow(state, "concluido"); return "done"; }
      await supabase.from("chat_flow_states").update({ current_node_id: next.id }).eq("id", state.id);
      // Se intent = "nao_sei" / "humano" não espera input, executa próximo nó
      return await executeNode(next, { ...state, tentativas_ia: (state.tentativas_ia ?? 0) + 1 }, params, flowDef);
    }

    case "condition": {
      const value = (state.collected_data ?? {})[node.data.field ?? ""] ?? "";
      const condType = node.data.condition_type ?? "is_not_empty";
      let result = false;
      if (condType === "is_not_empty") result = !!value && String(value).trim().length > 0;
      else if (condType === "is_empty") result = !value || String(value).trim().length === 0;
      else if (condType === "equals") result = String(value).toLowerCase() === String(node.data.condition_value ?? "").toLowerCase();
      else if (condType === "contains") result = String(value).toLowerCase().includes(String(node.data.condition_value ?? "").toLowerCase());

      const handle = result ? "true" : "false";
      const next = nextNode(flowDef, node.id, handle);
      if (!next) { await completeFlow(state, "concluido"); return "done"; }
      await supabase.from("chat_flow_states").update({ current_node_id: next.id }).eq("id", state.id);
      return await executeNode(next, state, params, flowDef);
    }

    case "transfer": {
      const dept = node.data.departamento ?? "vendas";
      if (node.data.message) {
        await sendFlowMessage(params.tenantId, params.conversaId, node.data.message, params.accessToken, params.phoneNumberId, params.toNumber);
      }
      await dispatchConversation(params.tenantId, params.conversaId, dept as "vendas" | "suporte", "flow_transfer");
      await completeFlow(state, "transferido");
      return "done";
    }

    case "end": {
      if (node.data.message) {
        await sendFlowMessage(params.tenantId, params.conversaId, node.data.message, params.accessToken, params.phoneNumberId, params.toNumber);
      }
      await completeFlow(state, "concluido");
      return "done";
    }

    default:
      return null;
  }
}

// ─── Processar input do lead no nó de Ask ───
async function handleNodeInput(node: any, state: any, params: any, flowDef: any): Promise<"done" | "waiting" | null> {
  const supabase = adminClient();

  if (node.type === "ask") {
    const saveAs = node.data.save_as ?? "resposta";
    await supabase.from("chat_flow_states").update({
      collected_data: { ...(state.collected_data ?? {}), [saveAs]: params.text },
    }).eq("id", state.id);

    const next = nextNode(flowDef, node.id, "default");
    if (!next) { await completeFlow(state, "concluido"); return "done"; }
    await supabase.from("chat_flow_states").update({ current_node_id: next.id }).eq("id", state.id);
    return await executeNode(next, { ...state, collected_data: { ...(state.collected_data ?? {}), [saveAs]: params.text } }, params, flowDef);
  }

  return null;
}

// ─── Completar fluxo ───
async function completeFlow(state: any, status: string) {
  const supabase = adminClient();
  await supabase.from("chat_flow_states").update({ status, completed_at: new Date().toISOString() }).eq("id", state.id);
}
