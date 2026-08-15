import { createServerClient } from "@supabase/ssr";
import { GoogleAuth } from "google-auth-library";
import { dispatchConversation } from "@/lib/dispatch";
import type { LooseDatabase } from "@/types/database";

const VERTEX_PROJECT = "adsliberty";
const VERTEX_LOCATION = "us-central1";

type FlowResult = "done" | "waiting" | null;
type QueueDepartment = "vendas" | "suporte";
type ConditionType = "is_not_empty" | "is_empty" | "equals" | "contains";

interface FlowOption {
  label: string;
  value: string;
}

interface FlowEdge {
  source: string;
  target: string;
  sourceHandle?: string | null;
}

interface StartNodeData {
  label?: string;
}

interface MessageNodeData {
  text?: string;
}

interface AskNodeData {
  question?: string;
  save_as?: string;
}

interface AskOptionsNodeData {
  question?: string;
  save_as?: string;
  options?: FlowOption[];
}

interface AIResponseNodeData {
  usar_kb?: boolean;
  context_prompt?: string;
  max_tentativas?: number;
}

interface ConditionNodeData {
  field?: string;
  condition_type?: ConditionType;
  condition_value?: string;
}

interface TransferNodeData {
  departamento?: string;
  message?: string;
}

interface EndNodeData {
  message?: string;
}

type FlowNode =
  | { id: string; type: "start"; data: StartNodeData }
  | { id: string; type: "message"; data: MessageNodeData }
  | { id: string; type: "ask"; data: AskNodeData }
  | { id: string; type: "ask_options"; data: AskOptionsNodeData }
  | { id: string; type: "ai_response"; data: AIResponseNodeData }
  | { id: string; type: "condition"; data: ConditionNodeData }
  | { id: string; type: "transfer"; data: TransferNodeData }
  | { id: string; type: "end"; data: EndNodeData };

interface FlowDefinition {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

interface ChatFlowRecord {
  id: string;
  is_master?: boolean | null;
  ativo?: boolean | null;
  trigger_keywords?: string[] | null;
  prioridade?: number | null;
  flow_definition?: unknown;
}

interface FlowStateRecord {
  id: string;
  tenant_id: string;
  conversa_id: string;
  flow_id: string;
  current_node_id: string;
  status: string;
  collected_data?: unknown;
  tentativas_ia?: number | null;
  completed_at?: string | null;
  chat_flows?: ChatFlowRecord | null;
}

interface PersonaRecord {
  descricao?: string | null;
  max_tokens?: number | null;
  temperatura?: number | null;
}

interface KnowledgeResultRow {
  categoria?: string | null;
  titulo?: string | null;
  conteudo?: string | null;
}

interface LeadLike {
  nome?: string | null;
}

export type FlowMessageSender = (text: string) => Promise<void>;

interface FlowProcessParams {
  tenantId: string;
  conversaId: string;
  leadId: string;
  lead: LeadLike;
  text: string;
  sendText: FlowMessageSender;
}

function adminClient() {
  return createServerClient<LooseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getFlowDefinition(value: unknown): FlowDefinition {
  if (!isRecord(value)) {
    return { nodes: [], edges: [] };
  }

  return {
    nodes: Array.isArray(value.nodes) ? (value.nodes as unknown as FlowNode[]) : [],
    edges: Array.isArray(value.edges) ? (value.edges as unknown as FlowEdge[]) : [],
  };
}

function getCollectedData(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, fieldValue]) => [key, String(fieldValue ?? "")])
  );
}

function normalizeDepartment(value: string | undefined): QueueDepartment {
  return value === "suporte" ? "suporte" : "vendas";
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .trim();
}

function matchesKeyword(message: string, keyword: string): boolean {
  const msgNorm = normalize(message);
  const kwNorm = normalize(keyword);
  if (!kwNorm) return false;
  return msgNorm.includes(kwNorm) || kwNorm.includes(msgNorm);
}

function nextNode(flowDef: FlowDefinition, currentNodeId: string, handleId: string = "default"): FlowNode | null {
  const edge = flowDef.edges.find((currentEdge) =>
    currentEdge.source === currentNodeId &&
    (currentEdge.sourceHandle === handleId || (!currentEdge.sourceHandle && handleId === "default"))
  );

  if (!edge) return null;
  return flowDef.nodes.find((node) => node.id === edge.target) ?? null;
}

async function detectIntentFromReply(reply: string, userMessage: string): Promise<string> {
  const text = `${reply} ${userMessage}`.toLowerCase();
  if (/(não sei|não consigo|desculpe|não tenho essa informação|vou encaminhar)/.test(text)) return "nao_sei";
  if (/(humano|atendente|pessoa|falar com alguém|suporte humano)/.test(normalize(userMessage))) return "humano";
  if (/(problema|erro|quebrado|não funciona|bug|defeito)/.test(normalize(userMessage))) return "suporte";
  if (/(preço|valor|comprar|contratar|proposta|plano)/.test(normalize(userMessage))) return "comercial";
  return "resolvido";
}

async function callGeminiFlow(
  node: Extract<FlowNode, { type: "ai_response" }>,
  state: FlowStateRecord,
  lead: LeadLike,
  tenantId: string,
  userMessage: string
): Promise<{ reply: string; intent: string }> {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
    const auth = new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
    const client = await auth.getClient();
    const token = (await client.getAccessToken()).token!;

    const supabase = adminClient();
    const { data: persona } = await supabase
      .from("personas")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("ativo", true)
      .order("created_at")
      .limit(1)
      .single();

    const currentPersona = persona as unknown as PersonaRecord | null;

    let kbContext = "";
    if (node.data.usar_kb && process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      try {
        const embedRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://3cliques-crm.vercel.app"}/api/ai/embed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: userMessage }),
        });

        if (embedRes.ok) {
          const { embedding } = (await embedRes.json()) as { embedding?: number[] };
          if (embedding && embedding.length > 0) {
            const { data: kbResults } = await supabase.rpc("buscar_conhecimento", {
              p_tenant_id: tenantId,
              query_embedding: `[${embedding.join(",")}]`,
              match_count: 3,
              threshold: 0.55,
            });

            const articles = (kbResults ?? []) as unknown as KnowledgeResultRow[];
            if (articles.length > 0) {
              kbContext = `\n\nCONHECIMENTO DISPONÍVEL:\n${articles
                .map((article) => `[${article.categoria ?? "Geral"}] ${article.titulo ?? ""}: ${article.conteudo ?? ""}`)
                .join("\n\n")}`;
            }
          }
        }
      } catch {
        // Conhecimento é opcional.
      }
    }

    const collectedData = getCollectedData(state.collected_data);
    const collectedStr = Object.keys(collectedData).length > 0
      ? `\n\nDADOS DO LEAD NO FLOW:\n${JSON.stringify(collectedData, null, 2)}`
      : "";

    const nodeContext = node.data.context_prompt
      ? `\n\nINSTRUÇÕES ESPECÍFICAS: ${node.data.context_prompt}`
      : "";
    const maxTentativas = node.data.max_tentativas ?? 3;
    const tentativasRestantes = maxTentativas - (state.tentativas_ia ?? 0);

    const systemPrompt = `${currentPersona?.descricao ?? "Você é um assistente especializado."} Lead: ${lead?.nome ?? "Desconhecido"}.${kbContext}${collectedStr}${nodeContext}

INSTRUÇÕES DO FLUXO:
- Tente resolver o problema do lead.
- Se conseguir resolver completamente, inclua "RESOLVIDO:" no início da sua resposta.
- Se não souber responder, diga claramente que vai encaminhar para um especialista.
- Seja breve e objetivo.
- Tentativas restantes: ${tentativasRestantes} de ${maxTentativas}.
- Responda em português.`;

    const url = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT}/locations/${VERTEX_LOCATION}/publishers/google/models/gemini-2.5-flash:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemPrompt }] },
          { role: "model", parts: [{ text: "Entendido!" }] },
          { role: "user", parts: [{ text: userMessage }] },
        ],
        generationConfig: {
          maxOutputTokens: Math.max(currentPersona?.max_tokens ?? 1000, 600),
          temperature: currentPersona?.temperatura ?? 0.7,
        },
      }),
    });

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const intent = await detectIntentFromReply(reply, userMessage);

    if ((state.tentativas_ia ?? 0) + 1 >= maxTentativas && intent !== "resolvido") {
      return { reply, intent: "nao_sei" };
    }

    return { reply, intent };
  } catch (error) {
    console.error("Flow Gemini error:", error);
    return { reply: "Desculpe, ocorreu um erro. Vou encaminhar para nossa equipe.", intent: "nao_sei" };
  }
}

async function sendFlowMessage(
  tenantId: string,
  conversaId: string,
  text: string,
  sendText: FlowMessageSender
) {
  const supabase = adminClient();
  await supabase.from("mensagens").insert({
    conversa_id: conversaId,
    tenant_id: tenantId,
    remetente: "ia",
    conteudo: text,
    enviada: false,
  });

  await sendText(text);

  await supabase.from("mensagens").update({ enviada: true })
    .eq("conversa_id", conversaId)
    .eq("remetente", "ia")
    .eq("enviada", false);
  await supabase.from("conversas").update({ updated_at: new Date().toISOString() }).eq("id", conversaId);
}

export async function processFlowMessage(params: FlowProcessParams): Promise<FlowResult> {
  const supabase = adminClient();

  const { data: activeState } = await supabase
    .from("chat_flow_states")
    .select("*, chat_flows(*)")
    .eq("conversa_id", params.conversaId)
    .in("status", ["ativo", "aguardando"])
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  const currentState = activeState as unknown as FlowStateRecord | null;
  if (currentState) {
    return continueFlow(currentState, params);
  }

  const { data: flows } = await supabase
    .from("chat_flows")
    .select("*")
    .eq("tenant_id", params.tenantId)
    .eq("ativo", true)
    .order("prioridade", { ascending: false });

  let masterFlow: ChatFlowRecord | null = null;

  for (const flow of ((flows ?? []) as unknown as ChatFlowRecord[])) {
    if (flow.is_master) {
      masterFlow = flow;
      continue;
    }

    const keywords = flow.trigger_keywords ?? [];
    if (keywords.length > 0 && keywords.some((keyword) => matchesKeyword(params.text, keyword))) {
      return startFlow(flow, params);
    }
  }

  if (masterFlow) {
    return startFlow(masterFlow, params);
  }

  return null;
}

async function startFlow(flow: ChatFlowRecord, params: FlowProcessParams): Promise<FlowResult> {
  const supabase = adminClient();
  const flowDef = getFlowDefinition(flow.flow_definition);
  const startNode = flowDef.nodes.find((node) => node.type === "start") ?? flowDef.nodes[0];
  if (!startNode) return null;

  const firstNode = nextNode(flowDef, startNode.id, "default");
  if (!firstNode) return null;

  const { data: state } = await supabase
    .from("chat_flow_states")
    .insert({
      tenant_id: params.tenantId,
      conversa_id: params.conversaId,
      flow_id: flow.id,
      current_node_id: firstNode.id,
      status: "ativo",
      collected_data: {},
      tentativas_ia: 0,
    })
    .select()
    .single();

  const currentState = state as unknown as FlowStateRecord | null;
  if (!currentState) return null;

  return executeNode(firstNode, { ...currentState, chat_flows: flow }, params, flowDef);
}

async function continueFlow(state: FlowStateRecord, params: FlowProcessParams): Promise<FlowResult> {
  const supabase = adminClient();
  const flowDef = getFlowDefinition(state.chat_flows?.flow_definition);
  const currentNode = flowDef.nodes.find((node) => node.id === state.current_node_id) ?? null;
  if (!currentNode) return null;

  if (state.status === "aguardando") {
    await supabase.from("chat_flow_states").update({ status: "ativo" }).eq("id", state.id);
    return handleNodeInput(currentNode, state, params, flowDef);
  }

  return executeNode(currentNode, state, params, flowDef);
}

async function executeNode(
  node: FlowNode,
  state: FlowStateRecord,
  params: FlowProcessParams,
  flowDef: FlowDefinition
): Promise<FlowResult> {
  const supabase = adminClient();

  switch (node.type) {
    case "message": {
      await sendFlowMessage(
        params.tenantId,
        params.conversaId,
        node.data.text ?? "",
        params.sendText
      );
      const next = nextNode(flowDef, node.id, "default");
      if (!next) {
        await completeFlow(state, "concluido");
        return "done";
      }
      await supabase.from("chat_flow_states").update({ current_node_id: next.id }).eq("id", state.id);
      return executeNode(next, state, params, flowDef);
    }

    case "ask": {
      await sendFlowMessage(
        params.tenantId,
        params.conversaId,
        node.data.question ?? "Como posso ajudar?",
        params.sendText
      );
      await supabase.from("chat_flow_states").update({ status: "aguardando", current_node_id: node.id }).eq("id", state.id);
      return "waiting";
    }

    case "ask_options": {
      const options = node.data.options ?? [];
      const menuText = `${node.data.question ?? "Escolha uma opção:"}\n\n${options
        .map((option, index) => `*${index + 1}.* ${option.label}`)
        .join("\n")}`;
      await sendFlowMessage(params.tenantId, params.conversaId, menuText, params.sendText);
      await supabase.from("chat_flow_states").update({ status: "aguardando", current_node_id: node.id }).eq("id", state.id);
      return "waiting";
    }

    case "ai_response": {
      const { reply, intent } = await callGeminiFlow(node, state, params.lead, params.tenantId, params.text);
      const cleanReply = reply.replace(/^RESOLVIDO:\s*/i, "");
      await sendFlowMessage(params.tenantId, params.conversaId, cleanReply, params.sendText);

      const tentativas = (state.tentativas_ia ?? 0) + 1;
      await supabase.from("chat_flow_states").update({ tentativas_ia: tentativas }).eq("id", state.id);

      const next = nextNode(flowDef, node.id, intent) ?? nextNode(flowDef, node.id, "default");
      if (!next) {
        await completeFlow(state, "concluido");
        return "done";
      }

      await supabase.from("chat_flow_states").update({ current_node_id: next.id }).eq("id", state.id);
      return executeNode(next, { ...state, tentativas_ia: tentativas }, params, flowDef);
    }

    case "condition": {
      const collectedData = getCollectedData(state.collected_data);
      const value = collectedData[node.data.field ?? ""] ?? "";
      const condType = node.data.condition_type ?? "is_not_empty";

      let result = false;
      if (condType === "is_not_empty") result = value.trim().length > 0;
      else if (condType === "is_empty") result = value.trim().length === 0;
      else if (condType === "equals") result = value.toLowerCase() === String(node.data.condition_value ?? "").toLowerCase();
      else if (condType === "contains") result = value.toLowerCase().includes(String(node.data.condition_value ?? "").toLowerCase());

      const next = nextNode(flowDef, node.id, result ? "true" : "false");
      if (!next) {
        await completeFlow(state, "concluido");
        return "done";
      }

      await supabase.from("chat_flow_states").update({ current_node_id: next.id }).eq("id", state.id);
      return executeNode(next, state, params, flowDef);
    }

    case "transfer": {
      const dept = normalizeDepartment(node.data.departamento);
      if (node.data.message) {
        await sendFlowMessage(params.tenantId, params.conversaId, node.data.message, params.sendText);
      }
      await dispatchConversation(params.tenantId, params.conversaId, dept, "flow_transfer");
      await completeFlow(state, "transferido");
      return "done";
    }

    case "end": {
      if (node.data.message) {
        await sendFlowMessage(params.tenantId, params.conversaId, node.data.message, params.sendText);
      }
      await completeFlow(state, "concluido");
      return "done";
    }

    default:
      return null;
  }
}

async function handleNodeInput(
  node: FlowNode,
  state: FlowStateRecord,
  params: FlowProcessParams,
  flowDef: FlowDefinition
): Promise<FlowResult> {
  const supabase = adminClient();

  if (node.type === "ask") {
    const saveAs = node.data.save_as ?? "resposta";
    const newData = { ...getCollectedData(state.collected_data), [saveAs]: params.text };
    await supabase.from("chat_flow_states").update({ collected_data: newData }).eq("id", state.id);

    const next = nextNode(flowDef, node.id, "default");
    if (!next) {
      await completeFlow(state, "concluido");
      return "done";
    }

    await supabase.from("chat_flow_states").update({ current_node_id: next.id }).eq("id", state.id);
    return executeNode(next, { ...state, collected_data: newData }, params, flowDef);
  }

  if (node.type === "ask_options") {
    const options = node.data.options ?? [];
    const userText = params.text.trim();

    let matchedValue: string | null = null;
    const numMatch = parseInt(userText, 10);
    if (!Number.isNaN(numMatch) && numMatch >= 1 && numMatch <= options.length) {
      matchedValue = options[numMatch - 1]?.value ?? String(numMatch);
    } else {
      const textMatch = options.find((option) =>
        normalize(option.label).includes(normalize(userText)) ||
        normalize(userText).includes(normalize(option.label))
      );
      if (textMatch) matchedValue = textMatch.value;
    }

    if (!matchedValue) {
      const menuText = `Opção inválida. ${node.data.question ?? "Escolha uma opção:"}\n\n${options
        .map((option, index) => `*${index + 1}.* ${option.label}`)
        .join("\n")}`;
      await sendFlowMessage(params.tenantId, params.conversaId, menuText, params.sendText);
      return "waiting";
    }

    const saveAs = node.data.save_as ?? "opcao";
    const newData = { ...getCollectedData(state.collected_data), [saveAs]: matchedValue };
    await supabase.from("chat_flow_states").update({ collected_data: newData }).eq("id", state.id);

    const next = nextNode(flowDef, node.id, matchedValue) ?? nextNode(flowDef, node.id, "default");
    if (!next) {
      await completeFlow(state, "concluido");
      return "done";
    }

    await supabase.from("chat_flow_states").update({ current_node_id: next.id }).eq("id", state.id);
    return executeNode(next, { ...state, collected_data: newData }, params, flowDef);
  }

  return null;
}

async function completeFlow(state: FlowStateRecord, status: string) {
  const supabase = adminClient();
  await supabase.from("chat_flow_states").update({
    status,
    completed_at: new Date().toISOString(),
  }).eq("id", state.id);
}
