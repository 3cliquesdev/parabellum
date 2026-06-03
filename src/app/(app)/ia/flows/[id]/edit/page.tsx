"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  MarkerType,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { ArrowLeft, Save } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";

type FlowNodeType =
  | "start"
  | "message"
  | "ask"
  | "ask_options"
  | "ai_response"
  | "condition"
  | "transfer"
  | "end";

type ConditionType = "is_not_empty" | "is_empty" | "equals" | "contains";

interface FlowOption {
  label: string;
  value: string;
}

interface FlowNodeData {
  label?: string;
  text?: string;
  question?: string;
  save_as?: string;
  context_prompt?: string;
  max_tentativas?: number;
  usar_kb?: boolean;
  field?: string;
  condition_type?: ConditionType;
  condition_value?: string;
  departamento?: "vendas" | "suporte";
  message?: string;
  options?: FlowOption[];
}

type FlowCanvasNode = Node<FlowNodeData, FlowNodeType>;
type FlowCanvasEdge = Edge;

interface FlowRecord {
  id: string;
  nome: string;
  trigger_keywords?: string[] | null;
  flow_definition?: {
    nodes?: FlowCanvasNode[];
    edges?: FlowCanvasEdge[];
  } | null;
}

interface FlowListResponse {
  flows?: FlowRecord[];
}

const NODE_COLORS: Record<FlowNodeType, string> = {
  start: "#939da4",
  message: "#60a5fa",
  ask: "#a78bfa",
  ask_options: "#f59e0b",
  ai_response: "#9aea62",
  condition: "#facc15",
  transfer: "#fb923c",
  end: "#f87171",
};

const NODE_LABELS: Record<FlowNodeType, string> = {
  start: "Início",
  message: "Mensagem",
  ask: "Coletar Info",
  ask_options: "Múltipla Escolha",
  ai_response: "IA Responde",
  condition: "Condição",
  transfer: "Transferir",
  end: "Finalizar",
};

const HANDLE_STYLE = { width: 10, height: 10, border: "2px solid #0a0a0a" };
const AI_OUTPUT_HANDLES = ["resolvido", "nao_sei", "humano", "comercial", "suporte", "default"] as const;

function BaseNodeShell({
  color,
  title,
  children,
  target = true,
  source = true,
}: {
  color: string;
  title: string;
  children: React.ReactNode;
  target?: boolean;
  source?: boolean;
}) {
  return (
    <div
      className="rounded-xl px-4 py-3 min-w-[160px] max-w-[240px]"
      style={{
        background: "linear-gradient(180deg,rgba(28,28,28,.95),rgba(18,18,18,1))",
        border: `2px solid ${color}50`,
      }}
    >
      {target && <Handle type="target" position={Position.Left} style={{ ...HANDLE_STYLE, background: color }} />}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <p className="text-[10px] font-bold uppercase" style={{ color }}>{title}</p>
      </div>
      {children}
      {source && <Handle type="source" position={Position.Right} style={{ ...HANDLE_STYLE, background: color }} />}
    </div>
  );
}

function StartNode({ data }: NodeProps<FlowNodeData>) {
  const color = NODE_COLORS.start;
  return (
    <BaseNodeShell color={color} title="Início" target={false}>
      <p className="text-xs text-white mt-0.5 truncate">{data.label || "Ponto de entrada"}</p>
    </BaseNodeShell>
  );
}

function MessageNode({ data }: NodeProps<FlowNodeData>) {
  const color = NODE_COLORS.message;
  return (
    <BaseNodeShell color={color} title="Mensagem">
      <p className="text-xs text-white truncate">{data.text || "Clique para editar..."}</p>
    </BaseNodeShell>
  );
}

function AskNode({ data }: NodeProps<FlowNodeData>) {
  const color = NODE_COLORS.ask;
  return (
    <BaseNodeShell color={color} title="Coletar Info">
      <p className="text-xs text-white truncate">{data.question || "Qual sua pergunta?"}</p>
      {data.save_as && <p className="text-[9px] mt-0.5 font-mono" style={{ color: "#939da4" }}>→ {data.save_as}</p>}
    </BaseNodeShell>
  );
}

function AIResponseNode({ data }: NodeProps<FlowNodeData>) {
  const color = NODE_COLORS.ai_response;
  return (
    <div
      className="rounded-xl px-4 py-3 min-w-[180px] max-w-[240px]"
      style={{
        background: "linear-gradient(180deg,rgba(28,28,28,.95),rgba(18,18,18,1))",
        border: `2px solid ${color}50`,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ ...HANDLE_STYLE, background: color }} />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <p className="text-[10px] font-bold uppercase" style={{ color }}>IA Responde</p>
      </div>
      <p className="text-xs text-white truncate">{data.context_prompt || "Gemini tenta resolver..."}</p>
      {data.max_tentativas && (
        <p className="text-[9px] mt-0.5" style={{ color: "#939da4" }}>
          Máx {data.max_tentativas} tentativa(s)
        </p>
      )}
      <div className="mt-2 space-y-1.5">
        {AI_OUTPUT_HANDLES.map((intent) => (
          <div key={intent} className="flex items-center justify-between">
            <span className="text-[9px] font-mono" style={{ color: "#939da4" }}>{intent}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={intent}
              style={{ ...HANDLE_STYLE, background: color, position: "relative", top: "auto", transform: "none", right: -12 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ConditionNode({ data }: NodeProps<FlowNodeData>) {
  const color = NODE_COLORS.condition;
  return (
    <div
      className="rounded-xl px-4 py-3 min-w-[160px] max-w-[220px]"
      style={{
        background: "linear-gradient(180deg,rgba(28,28,28,.95),rgba(18,18,18,1))",
        border: `2px solid ${color}50`,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ ...HANDLE_STYLE, background: color }} />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <p className="text-[10px] font-bold uppercase" style={{ color }}>Condição</p>
      </div>
      <p className="text-xs text-white truncate">{data.field ? `Se "${data.field}"` : "Configure condição"}</p>
      <div className="mt-2 flex justify-end flex-col items-end gap-2">
        <div className="flex items-center gap-1">
          <span className="text-[9px]" style={{ color: "#9aea62" }}>sim</span>
          <Handle
            type="source"
            id="true"
            position={Position.Right}
            style={{ ...HANDLE_STYLE, background: "#9aea62", position: "relative", top: "auto", transform: "none", right: -8 }}
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px]" style={{ color: "#f87171" }}>não</span>
          <Handle
            type="source"
            id="false"
            position={Position.Right}
            style={{ ...HANDLE_STYLE, background: "#f87171", position: "relative", top: "auto", transform: "none", right: -8 }}
          />
        </div>
      </div>
    </div>
  );
}

function TransferNode({ data }: NodeProps<FlowNodeData>) {
  const color = NODE_COLORS.transfer;
  return (
    <BaseNodeShell color={color} title="Transferir" source={false}>
      <p className="text-xs font-bold capitalize" style={{ color }}>{data.departamento || "vendas"}</p>
      {data.message && <p className="text-[9px] mt-0.5 truncate" style={{ color: "#939da4" }}>{data.message}</p>}
    </BaseNodeShell>
  );
}

function EndNode({ data }: NodeProps<FlowNodeData>) {
  const color = NODE_COLORS.end;
  return (
    <BaseNodeShell color={color} title="Finalizar" source={false}>
      <p className="text-xs text-white truncate">{data.message || "Fluxo encerrado"}</p>
    </BaseNodeShell>
  );
}

function AskOptionsNode({ data }: NodeProps<FlowNodeData>) {
  const color = NODE_COLORS.ask_options;
  const options = data.options ?? [];

  return (
    <div
      className="rounded-xl px-4 py-3 min-w-[180px] max-w-[240px]"
      style={{
        background: "linear-gradient(180deg,rgba(28,28,28,.95),rgba(18,18,18,1))",
        border: `2px solid ${color}50`,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ ...HANDLE_STYLE, background: color }} />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <p className="text-[10px] font-bold uppercase" style={{ color }}>Múltipla Escolha</p>
      </div>
      <p className="text-xs text-white truncate mb-2">{data.question || "Escolha uma opção:"}</p>
      <div className="space-y-1.5">
        {options.map((option, index) => (
          <div key={option.value} className="flex items-center justify-between">
            <span className="text-[9px]" style={{ color: "#939da4" }}>{index + 1}. {option.label}</span>
            <Handle
              type="source"
              id={option.value || String(index + 1)}
              position={Position.Right}
              style={{ ...HANDLE_STYLE, background: color, position: "relative", top: "auto", transform: "none", right: -12 }}
            />
          </div>
        ))}
        {options.length === 0 && <p className="text-[9px]" style={{ color: "#939da4" }}>Configure as opções →</p>}
      </div>
    </div>
  );
}

const nodeTypes = {
  start: StartNode,
  message: MessageNode,
  ask: AskNode,
  ask_options: AskOptionsNode,
  ai_response: AIResponseNode,
  condition: ConditionNode,
  transfer: TransferNode,
  end: EndNode,
};

const NODE_PALETTE: Array<{ type: Exclude<FlowNodeType, "start">; label: string; desc: string }> = [
  { type: "message", label: "Mensagem", desc: "Envia texto para o lead" },
  { type: "ask", label: "Coletar Info", desc: "Pergunta e salva resposta" },
  { type: "ask_options", label: "Múltipla Escolha", desc: "Menu numerado — lead escolhe opção" },
  { type: "ai_response", label: "IA Responde", desc: "Gemini tenta resolver" },
  { type: "condition", label: "Condição", desc: "Bifurca baseado em dados" },
  { type: "transfer", label: "Transferir", desc: "Handoff para humano" },
  { type: "end", label: "Finalizar", desc: "Encerra o fluxo" },
];

function decorateEdge(edge: Connection | FlowCanvasEdge): FlowCanvasEdge {
  const fallbackId = `${edge.source ?? "source"}-${edge.sourceHandle ?? "out"}-${edge.target ?? "target"}-${edge.targetHandle ?? "in"}`;

  return {
    ...edge,
    id: "id" in edge ? edge.id : fallbackId,
    source: edge.source ?? "",
    target: edge.target ?? "",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#9aea62" },
    style: { stroke: "#9aea62", strokeWidth: 1.5 },
  };
}

export default function FlowEditPage() {
  const params = useParams();
  const { tenantId } = useTenant();
  const flowId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowCanvasEdge>([]);
  const [selectedNode, setSelectedNode] = useState<FlowCanvasNode | null>(null);
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState("");
  const [keywords, setKeywords] = useState("");
  const nextNodeIdRef = useRef(1);
  const nextPositionRef = useRef({ x: 220, y: 160 });

  useEffect(() => {
    if (!flowId || !tenantId) return;

    fetch(`/api/flows?tenant_id=${tenantId}`)
      .then((response) => response.json() as Promise<FlowListResponse>)
      .then((data) => {
        const currentFlow = (data.flows ?? []).find((item) => item.id === flowId);
        if (!currentFlow) return;

        setNome(currentFlow.nome);
        setKeywords((currentFlow.trigger_keywords ?? []).join(", "));

        const definition = currentFlow.flow_definition ?? { nodes: [], edges: [] };
        const flowNodes = definition.nodes ?? [];
        const flowEdges = (definition.edges ?? []).map(decorateEdge);

        setNodes(flowNodes);
        setEdges(flowEdges);
        nextNodeIdRef.current = flowNodes.length + 1;
      });
  }, [flowId, setEdges, setNodes, tenantId]);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((currentEdges) => addEdge(decorateEdge(connection), currentEdges));
  }, [setEdges]);

  function addNode(type: Exclude<FlowNodeType, "start">) {
    const id = `${type}-${nextNodeIdRef.current}`;
    nextNodeIdRef.current += 1;

    const currentPosition = nextPositionRef.current;
    nextPositionRef.current = {
      x: currentPosition.x + 36,
      y: currentPosition.y + (nextNodeIdRef.current % 2 === 0 ? 72 : -24),
    };

    const newNode: FlowCanvasNode = {
      id,
      type,
      position: currentPosition,
      data: { label: NODE_LABELS[type] },
    };

    setNodes((currentNodes) => [...currentNodes, newNode]);
  }

  async function save() {
    if (!flowId) return;

    setSaving(true);
    await fetch("/api/flows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flow_id: flowId,
        nome,
        trigger_keywords: keywords.split(",").map((keyword) => keyword.trim().toLowerCase()).filter(Boolean),
        flow_definition: { nodes, edges },
      }),
    });
    setSaving(false);
  }

  function updateSelectedNode<K extends keyof FlowNodeData>(field: K, value: FlowNodeData[K]) {
    if (!selectedNode) return;

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === selectedNode.id
          ? { ...node, data: { ...node.data, [field]: value } }
          : node
      )
    );

    setSelectedNode((currentSelected) =>
      currentSelected
        ? { ...currentSelected, data: { ...currentSelected.data, [field]: value } }
        : null
    );
  }

  const selectedNodeType = selectedNode?.type;
  const selectedNodeColor = selectedNodeType ? NODE_COLORS[selectedNodeType] : "#939da4";

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "var(--font-sans)", background: "#000" }}>
      <div
        className="flex items-center gap-3 px-4 h-14 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#0a0a0a" }}
      >
        <Link href="/ia/flows" className="flex items-center gap-1.5 text-xs" style={{ color: "#939da4" }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Fluxos
        </Link>
        <div className="w-px h-4" style={{ background: "rgba(255,255,255,0.1)" }} />
        <input
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          className="text-sm font-bold text-white bg-transparent outline-none border-none flex-1"
          placeholder="Nome do fluxo"
        />
        <p className="text-[10px] hidden sm:block" style={{ color: "rgba(147,157,164,0.5)" }}>
          Arraste nós da paleta · Conecte arrastando as bolinhas
        </p>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-bold shrink-0"
          style={{ background: saving ? "rgba(154,234,98,0.1)" : "#9aea62", color: saving ? "#9aea62" : "#0a0a0a" }}
        >
          <Save className="w-3.5 h-3.5" /> {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          className="w-52 shrink-0 flex flex-col py-4 px-3 gap-1 overflow-y-auto"
          style={{ borderRight: "1px solid rgba(255,255,255,0.06)", background: "#060606" }}
        >
          <p className="section-label mb-2 px-1">Keywords de ativação</p>
          <input
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
            placeholder="oi, olá, problema..."
            className="w-full h-8 px-2.5 rounded-lg text-xs text-white outline-none mb-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          />

          <p className="section-label mb-2 px-1">Adicionar nó</p>
          {NODE_PALETTE.map((nodeConfig) => (
            <button
              key={nodeConfig.type}
              onClick={() => addNode(nodeConfig.type)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left"
              onMouseEnter={(event) => {
                event.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = "transparent";
              }}
              style={{ border: "1px solid transparent" }}
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: NODE_COLORS[nodeConfig.type] }} />
              <div>
                <p className="text-xs font-bold text-white">{nodeConfig.label}</p>
                <p className="text-[10px]" style={{ color: "#939da4" }}>{nodeConfig.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedNode(node as FlowCanvasNode)}
            onPaneClick={() => setSelectedNode(null)}
            fitView
            deleteKeyCode="Delete"
            style={{ background: "#000" }}
          >
            <Background color="rgba(255,255,255,0.04)" gap={24} />
            <Controls style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)" }} />
            <MiniMap
              style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)" }}
              nodeColor={(node) => NODE_COLORS[(node.type as FlowNodeType) ?? "start"] ?? "#939da4"}
            />
          </ReactFlow>
        </div>

        {selectedNode && (
          <div
            className="w-64 shrink-0 flex flex-col py-4 px-3 gap-3 overflow-y-auto"
            style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", background: "#060606" }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: selectedNodeColor }} />
                  <p className="text-xs font-bold text-white">
                    {selectedNodeType ? NODE_LABELS[selectedNodeType] : "Nó"}
                  </p>
            </div>

            {selectedNodeType === "message" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Texto</label>
                <textarea
                  value={selectedNode.data.text ?? ""}
                  onChange={(event) => updateSelectedNode("text", event.target.value)}
                  rows={4}
                  className="w-full p-2 rounded-lg text-xs text-white outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>
            )}

            {selectedNodeType === "ask_options" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Pergunta / título do menu</label>
                  <input
                    value={selectedNode.data.question ?? ""}
                    onChange={(event) => updateSelectedNode("question", event.target.value)}
                    placeholder="O que você precisa?"
                    className="w-full h-8 px-2 rounded-lg text-xs text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Salvar resposta como</label>
                  <input
                    value={selectedNode.data.save_as ?? "opcao"}
                    onChange={(event) => updateSelectedNode("save_as", event.target.value)}
                    className="w-full h-8 px-2 rounded-lg text-xs text-white outline-none font-mono"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Opções</label>
                    <button
                      onClick={() => {
                        const currentOptions = selectedNode.data.options ?? [];
                        const nextOptionNumber = currentOptions.length + 1;
                        updateSelectedNode("options", [
                          ...currentOptions,
                          { label: `Opção ${nextOptionNumber}`, value: `opcao_${nextOptionNumber}` },
                        ]);
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62" }}
                    >
                      + Opção
                    </button>
                  </div>
                  {(selectedNode.data.options ?? []).map((option, index) => (
                    <div key={option.value} className="flex gap-1.5">
                      <input
                        value={option.label}
                        onChange={(event) => {
                          const nextOptions = [...(selectedNode.data.options ?? [])];
                          nextOptions[index] = { ...nextOptions[index], label: event.target.value };
                          updateSelectedNode("options", nextOptions);
                        }}
                        placeholder={`Opção ${index + 1}`}
                        className="flex-1 h-7 px-2 rounded-lg text-xs text-white outline-none"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      />
                      <button
                        onClick={() => {
                          const nextOptions = (selectedNode.data.options ?? []).filter((_, currentIndex) => currentIndex !== index);
                          updateSelectedNode("options", nextOptions);
                        }}
                        className="text-[10px] px-1.5"
                        style={{ color: "rgba(248,113,113,0.5)" }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <p className="text-[9px]" style={{ color: "rgba(147,157,164,0.4)" }}>
                    Cada opção cria uma saída. Conecte cada saída ao próximo nó.
                  </p>
                </div>
              </>
            )}

            {selectedNodeType === "ask" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Pergunta</label>
                  <input
                    value={selectedNode.data.question ?? ""}
                    onChange={(event) => updateSelectedNode("question", event.target.value)}
                    className="w-full h-8 px-2 rounded-lg text-xs text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Salvar como</label>
                  <input
                    value={selectedNode.data.save_as ?? ""}
                    onChange={(event) => updateSelectedNode("save_as", event.target.value)}
                    placeholder="nome, email, telefone..."
                    className="w-full h-8 px-2 rounded-lg text-xs text-white outline-none font-mono"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                </div>
              </>
            )}

            {selectedNodeType === "ai_response" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Instruções</label>
                  <textarea
                    value={selectedNode.data.context_prompt ?? ""}
                    onChange={(event) => updateSelectedNode("context_prompt", event.target.value)}
                    rows={3}
                    placeholder="Ex: Foque em resolver problemas técnicos..."
                    className="w-full p-2 rounded-lg text-xs text-white outline-none resize-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Máx tentativas</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={selectedNode.data.max_tentativas ?? 2}
                    onChange={(event) => updateSelectedNode("max_tentativas", parseInt(event.target.value, 10))}
                    className="w-full h-8 px-2 rounded-lg text-xs text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedNode.data.usar_kb ?? true}
                    onChange={(event) => updateSelectedNode("usar_kb", event.target.checked)}
                  />
                  <span className="text-xs" style={{ color: "#939da4" }}>Usar base de conhecimento</span>
                </label>
                <div
                  className="rounded-lg p-2"
                  style={{ background: "rgba(154,234,98,0.04)", border: "1px solid rgba(154,234,98,0.1)" }}
                >
                  <p className="text-[9px] font-bold mb-1" style={{ color: "#9aea62" }}>Conecte as saídas:</p>
                  {AI_OUTPUT_HANDLES.map((handle) => (
                    <p key={handle} className="text-[9px] font-mono" style={{ color: "#939da4" }}>→ {handle}</p>
                  ))}
                </div>
              </>
            )}

            {selectedNodeType === "condition" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Campo a verificar</label>
                  <input
                    value={selectedNode.data.field ?? ""}
                    onChange={(event) => updateSelectedNode("field", event.target.value)}
                    placeholder="nome, email, resposta..."
                    className="w-full h-8 px-2 rounded-lg text-xs text-white outline-none font-mono"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Tipo</label>
                  <select
                    value={selectedNode.data.condition_type ?? "is_not_empty"}
                    onChange={(event) => updateSelectedNode("condition_type", event.target.value as ConditionType)}
                    className="w-full h-8 px-2 rounded-lg text-xs outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}
                  >
                    <option value="is_not_empty" style={{ background: "#111" }}>Está preenchido</option>
                    <option value="is_empty" style={{ background: "#111" }}>Está vazio</option>
                    <option value="equals" style={{ background: "#111" }}>É igual a...</option>
                    <option value="contains" style={{ background: "#111" }}>Contém...</option>
                  </select>
                </div>
                {["equals", "contains"].includes(selectedNode.data.condition_type ?? "") && (
                  <input
                    value={selectedNode.data.condition_value ?? ""}
                    onChange={(event) => updateSelectedNode("condition_value", event.target.value)}
                    placeholder="valor para comparar"
                    className="w-full h-8 px-2 rounded-lg text-xs text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                )}
              </>
            )}

            {selectedNodeType === "transfer" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Departamento</label>
                  <select
                    value={selectedNode.data.departamento ?? "vendas"}
                    onChange={(event) => updateSelectedNode("departamento", event.target.value as "vendas" | "suporte")}
                    className="w-full h-8 px-2 rounded-lg text-xs outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}
                  >
                    <option value="vendas" style={{ background: "#111" }}>Vendas</option>
                    <option value="suporte" style={{ background: "#111" }}>Suporte</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Mensagem antes</label>
                  <input
                    value={selectedNode.data.message ?? ""}
                    onChange={(event) => updateSelectedNode("message", event.target.value)}
                    placeholder="Vou conectar com nossa equipe..."
                    className="w-full h-8 px-2 rounded-lg text-xs text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                </div>
              </>
            )}

            {selectedNodeType === "end" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Mensagem final</label>
                <input
                  value={selectedNode.data.message ?? ""}
                  onChange={(event) => updateSelectedNode("message", event.target.value)}
                  placeholder="Obrigado! Até logo."
                  className="w-full h-8 px-2 rounded-lg text-xs text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>
            )}

            <p className="text-[9px] mt-2" style={{ color: "rgba(147,157,164,0.4)" }}>
              Delete para remover o nó selecionado
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
