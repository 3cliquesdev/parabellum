"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactFlow, {
  Background, Controls, MiniMap, addEdge,
  useNodesState, useEdgesState, type Connection,
  type Node, type Edge, MarkerType,
  Handle, Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { ArrowLeft, Save } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";

const NODE_COLORS: Record<string, string> = {
  start:        "#939da4",
  message:      "#60a5fa",
  ask:          "#a78bfa",
  ask_options:  "#f59e0b",
  ai_response:  "#9aea62",
  condition:    "#facc15",
  transfer:     "#fb923c",
  end:          "#f87171",
};

const NODE_LABELS: Record<string, string> = {
  start:       "Início",
  message:     "Mensagem",
  ask:         "Coletar Info",
  ai_response: "IA Responde",
  condition:   "Condição",
  transfer:    "Transferir",
  end:         "Finalizar",
};

const HANDLE_STYLE = { width: 10, height: 10, border: "2px solid #0a0a0a" };

// ─── Nós customizados com handles ───
function StartNode({ data }: any) {
  const color = NODE_COLORS.start;
  return (
    <div className="rounded-xl px-4 py-3 min-w-[140px]"
      style={{ background: "linear-gradient(180deg,rgba(28,28,28,.95),rgba(18,18,18,1))", border: `2px solid ${color}50` }}>
      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: color }} /><p className="text-[10px] font-bold uppercase" style={{ color }}>Início</p></div>
      <p className="text-xs text-white mt-0.5 truncate">{data.label || "Ponto de entrada"}</p>
      <Handle type="source" position={Position.Right} style={{ ...HANDLE_STYLE, background: color }} />
    </div>
  );
}

function MessageNode({ data }: any) {
  const color = NODE_COLORS.message;
  return (
    <div className="rounded-xl px-4 py-3 min-w-[160px] max-w-[220px]"
      style={{ background: "linear-gradient(180deg,rgba(28,28,28,.95),rgba(18,18,18,1))", border: `2px solid ${color}50` }}>
      <Handle type="target" position={Position.Left} style={{ ...HANDLE_STYLE, background: color }} />
      <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full" style={{ background: color }} /><p className="text-[10px] font-bold uppercase" style={{ color }}>Mensagem</p></div>
      <p className="text-xs text-white truncate">{data.text || "Clique para editar..."}</p>
      <Handle type="source" position={Position.Right} style={{ ...HANDLE_STYLE, background: color }} />
    </div>
  );
}

function AskNode({ data }: any) {
  const color = NODE_COLORS.ask;
  return (
    <div className="rounded-xl px-4 py-3 min-w-[160px] max-w-[220px]"
      style={{ background: "linear-gradient(180deg,rgba(28,28,28,.95),rgba(18,18,18,1))", border: `2px solid ${color}50` }}>
      <Handle type="target" position={Position.Left} style={{ ...HANDLE_STYLE, background: color }} />
      <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full" style={{ background: color }} /><p className="text-[10px] font-bold uppercase" style={{ color }}>Coletar Info</p></div>
      <p className="text-xs text-white truncate">{data.question || "Qual sua pergunta?"}</p>
      {data.save_as && <p className="text-[9px] mt-0.5 font-mono" style={{ color: "#939da4" }}>→ {data.save_as}</p>}
      <Handle type="source" position={Position.Right} style={{ ...HANDLE_STYLE, background: color }} />
    </div>
  );
}

function AIResponseNode({ data }: any) {
  const color = NODE_COLORS.ai_response;
  const intents = ["resolvido", "nao_sei", "humano", "comercial", "suporte", "default"];
  return (
    <div className="rounded-xl px-4 py-3 min-w-[180px] max-w-[240px]"
      style={{ background: "linear-gradient(180deg,rgba(28,28,28,.95),rgba(18,18,18,1))", border: `2px solid ${color}50` }}>
      <Handle type="target" position={Position.Left} style={{ ...HANDLE_STYLE, background: color }} />
      <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full" style={{ background: color }} /><p className="text-[10px] font-bold uppercase" style={{ color }}>IA Responde</p></div>
      <p className="text-xs text-white truncate">{data.context_prompt || "Gemini tenta resolver..."}</p>
      {data.max_tentativas && <p className="text-[9px] mt-0.5" style={{ color: "#939da4" }}>Máx {data.max_tentativas} tentativa(s)</p>}
      {/* Múltiplos handles de saída por intent */}
      <div className="mt-2 space-y-1.5">
        {intents.map((intent, i) => (
          <div key={intent} className="flex items-center justify-between">
            <span className="text-[9px] font-mono" style={{ color: "#939da4" }}>{intent}</span>
            <Handle type="source" position={Position.Right} id={intent}
              style={{ ...HANDLE_STYLE, background: color, position: "relative", top: "auto", transform: "none", right: -12 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ConditionNode({ data }: any) {
  const color = NODE_COLORS.condition;
  return (
    <div className="rounded-xl px-4 py-3 min-w-[160px] max-w-[220px]"
      style={{ background: "linear-gradient(180deg,rgba(28,28,28,.95),rgba(18,18,18,1))", border: `2px solid ${color}50` }}>
      <Handle type="target" position={Position.Left} style={{ ...HANDLE_STYLE, background: color }} />
      <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full" style={{ background: color }} /><p className="text-[10px] font-bold uppercase" style={{ color }}>Condição</p></div>
      <p className="text-xs text-white truncate">{data.field ? `Se "${data.field}"` : "Configure condição"}</p>
      <div className="mt-2 flex justify-end flex-col items-end gap-2">
        <div className="flex items-center gap-1"><span className="text-[9px]" style={{ color: "#9aea62" }}>sim</span><Handle type="source" id="true" position={Position.Right} style={{ ...HANDLE_STYLE, background: "#9aea62", position: "relative", top: "auto", transform: "none", right: -8 }} /></div>
        <div className="flex items-center gap-1"><span className="text-[9px]" style={{ color: "#f87171" }}>não</span><Handle type="source" id="false" position={Position.Right} style={{ ...HANDLE_STYLE, background: "#f87171", position: "relative", top: "auto", transform: "none", right: -8 }} /></div>
      </div>
    </div>
  );
}

function TransferNode({ data }: any) {
  const color = NODE_COLORS.transfer;
  return (
    <div className="rounded-xl px-4 py-3 min-w-[160px] max-w-[220px]"
      style={{ background: "linear-gradient(180deg,rgba(28,28,28,.95),rgba(18,18,18,1))", border: `2px solid ${color}50` }}>
      <Handle type="target" position={Position.Left} style={{ ...HANDLE_STYLE, background: color }} />
      <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full" style={{ background: color }} /><p className="text-[10px] font-bold uppercase" style={{ color }}>Transferir</p></div>
      <p className="text-xs font-bold capitalize" style={{ color }}>{data.departamento || "vendas"}</p>
      {data.message && <p className="text-[9px] mt-0.5 truncate" style={{ color: "#939da4" }}>{data.message}</p>}
    </div>
  );
}

function EndNode({ data }: any) {
  const color = NODE_COLORS.end;
  return (
    <div className="rounded-xl px-4 py-3 min-w-[140px] max-w-[200px]"
      style={{ background: "linear-gradient(180deg,rgba(28,28,28,.95),rgba(18,18,18,1))", border: `2px solid ${color}50` }}>
      <Handle type="target" position={Position.Left} style={{ ...HANDLE_STYLE, background: color }} />
      <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full" style={{ background: color }} /><p className="text-[10px] font-bold uppercase" style={{ color }}>Finalizar</p></div>
      <p className="text-xs text-white truncate">{data.message || "Fluxo encerrado"}</p>
    </div>
  );
}

// ─── Ask Options Node ───
function AskOptionsNode({ data }: any) {
  const color = "#f59e0b";
  const options: { label: string; value: string }[] = data.options ?? [];
  return (
    <div className="rounded-xl px-4 py-3 min-w-[180px] max-w-[240px]"
      style={{ background: "linear-gradient(180deg,rgba(28,28,28,.95),rgba(18,18,18,1))", border: `2px solid ${color}50` }}>
      <Handle type="target" position={Position.Left} style={{ ...HANDLE_STYLE, background: color }} />
      <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full" style={{ background: color }} /><p className="text-[10px] font-bold uppercase" style={{ color }}>Múltipla Escolha</p></div>
      <p className="text-xs text-white truncate mb-2">{data.question || "Escolha uma opção:"}</p>
      <div className="space-y-1.5">
        {options.map((o, i) => (
          <div key={o.value} className="flex items-center justify-between">
            <span className="text-[9px]" style={{ color: "#939da4" }}>{i + 1}. {o.label}</span>
            <Handle type="source" id={o.value || String(i + 1)} position={Position.Right}
              style={{ ...HANDLE_STYLE, background: color, position: "relative", top: "auto", transform: "none", right: -12 }} />
          </div>
        ))}
        {options.length === 0 && <p className="text-[9px]" style={{ color: "#939da4" }}>Configure as opções →</p>}
      </div>
    </div>
  );
}

const nodeTypes = {
  start:       StartNode,
  message:     MessageNode,
  ask:         AskNode,
  ask_options: AskOptionsNode,
  ai_response: AIResponseNode,
  condition:   ConditionNode,
  transfer:    TransferNode,
  end:         EndNode,
};

const NODE_PALETTE = [
  { type: "message",     label: "Mensagem",         desc: "Envia texto para o lead" },
  { type: "ask",         label: "Coletar Info",      desc: "Pergunta e salva resposta" },
  { type: "ask_options", label: "Múltipla Escolha",  desc: "Menu numerado — lead escolhe opção" },
  { type: "ai_response", label: "IA Responde",        desc: "Gemini tenta resolver" },
  { type: "condition",   label: "Condição",           desc: "Bifurca baseado em dados" },
  { type: "transfer",    label: "Transferir",         desc: "Handoff para humano" },
  { type: "end",         label: "Finalizar",          desc: "Encerra o fluxo" },
];

export default function FlowEditPage() {
  const params = useParams();
  const router = useRouter();
  const { tenantId } = useTenant();
  const flowId = params.id as string;

  const [flow, setFlow] = useState<any>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState("");
  const [keywords, setKeywords] = useState("");

  useEffect(() => {
    if (!flowId || !tenantId) return;
    fetch(`/api/flows?tenant_id=${tenantId}`).then(r => r.json()).then(d => {
      const f = (d.flows ?? []).find((x: any) => x.id === flowId);
      if (!f) return;
      setFlow(f); setNome(f.nome);
      setKeywords((f.trigger_keywords ?? []).join(", "));
      const fd = f.flow_definition ?? { nodes: [], edges: [] };
      setNodes(fd.nodes ?? []);
      setEdges((fd.edges ?? []).map((e: any) => ({
        ...e,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#9aea62" },
        style: { stroke: "#9aea62", strokeWidth: 1.5 },
      })));
    });
  }, [flowId, tenantId]);

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge({
      ...connection,
      markerEnd: { type: MarkerType.ArrowClosed, color: "#9aea62" },
      style: { stroke: "#9aea62", strokeWidth: 1.5 },
    }, eds));
  }, [setEdges]);

  function addNode(type: string) {
    const id = `${type}-${Date.now()}`;
    const newNode: Node = {
      id, type,
      position: { x: Math.random() * 300 + 200, y: Math.random() * 200 + 150 },
      data: { label: NODE_LABELS[type] },
    };
    setNodes(ns => [...ns, newNode]);
  }

  async function save() {
    if (!flowId) return;
    setSaving(true);
    await fetch("/api/flows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flow_id: flowId, nome,
        trigger_keywords: keywords.split(",").map(k => k.trim().toLowerCase()).filter(Boolean),
        flow_definition: { nodes, edges },
      }),
    });
    setSaving(false);
  }

  function updateSelectedNode(field: string, value: any) {
    if (!selectedNode) return;
    setNodes(ns => ns.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, [field]: value } } : n));
    setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, [field]: value } } : null);
  }

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "var(--font-sans)", background: "#000" }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 h-14 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#0a0a0a" }}>
        <Link href="/ia/flows" className="flex items-center gap-1.5 text-xs" style={{ color: "#939da4" }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Fluxos
        </Link>
        <div className="w-px h-4" style={{ background: "rgba(255,255,255,0.1)" }} />
        <input value={nome} onChange={e => setNome(e.target.value)}
          className="text-sm font-bold text-white bg-transparent outline-none border-none flex-1"
          placeholder="Nome do fluxo" />
        <p className="text-[10px] hidden sm:block" style={{ color: "rgba(147,157,164,0.5)" }}>
          Arraste nós da paleta · Conecte arrastando as bolinhas
        </p>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-bold shrink-0"
          style={{ background: saving ? "rgba(154,234,98,0.1)" : "#9aea62", color: saving ? "#9aea62" : "#0a0a0a" }}>
          <Save className="w-3.5 h-3.5" /> {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left palette */}
        <div className="w-52 shrink-0 flex flex-col py-4 px-3 gap-1 overflow-y-auto"
          style={{ borderRight: "1px solid rgba(255,255,255,0.06)", background: "#060606" }}>
          <p className="section-label mb-2 px-1">Keywords de ativação</p>
          <input value={keywords} onChange={e => setKeywords(e.target.value)}
            placeholder="oi, olá, problema..."
            className="w-full h-8 px-2.5 rounded-lg text-xs text-white outline-none mb-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />

          <p className="section-label mb-2 px-1">Adicionar nó</p>
          {NODE_PALETTE.map(n => (
            <button key={n.type} onClick={() => addNode(n.type)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left"
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              style={{ border: "1px solid transparent" }}>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: NODE_COLORS[n.type] }} />
              <div>
                <p className="text-xs font-bold text-white">{n.label}</p>
                <p className="text-[10px]" style={{ color: "#939da4" }}>{n.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect} nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedNode(node)}
            onPaneClick={() => setSelectedNode(null)}
            fitView deleteKeyCode="Delete"
            style={{ background: "#000" }}>
            <Background color="rgba(255,255,255,0.04)" gap={24} />
            <Controls style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)" }} />
            <MiniMap style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)" }}
              nodeColor={n => NODE_COLORS[n.type ?? ""] ?? "#939da4"} />
          </ReactFlow>
        </div>

        {/* Right properties */}
        {selectedNode && (
          <div className="w-64 shrink-0 flex flex-col py-4 px-3 gap-3 overflow-y-auto"
            style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", background: "#060606" }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: NODE_COLORS[selectedNode.type ?? ""] }} />
              <p className="text-xs font-bold text-white">{NODE_LABELS[selectedNode.type ?? ""]}</p>
            </div>

            {selectedNode.type === "message" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Texto</label>
                <textarea value={selectedNode.data.text ?? ""} onChange={e => updateSelectedNode("text", e.target.value)} rows={4}
                  className="w-full p-2 rounded-lg text-xs text-white outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
            )}

            {selectedNode.type === "ask_options" && (<>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Pergunta / Título do menu</label>
                <input value={selectedNode.data.question ?? ""} onChange={e => updateSelectedNode("question", e.target.value)}
                  placeholder="O que você precisa?" className="w-full h-8 px-2 rounded-lg text-xs text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Salvar resposta como</label>
                <input value={selectedNode.data.save_as ?? "opcao"} onChange={e => updateSelectedNode("save_as", e.target.value)}
                  className="w-full h-8 px-2 rounded-lg text-xs text-white outline-none font-mono"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Opções (uma por linha)</label>
                  <button onClick={() => {
                    const opts = [...(selectedNode.data.options ?? []), { label: `Opção ${(selectedNode.data.options ?? []).length + 1}`, value: `opcao_${(selectedNode.data.options ?? []).length + 1}` }];
                    updateSelectedNode("options", opts);
                  }} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62" }}>+ Opção</button>
                </div>
                {(selectedNode.data.options ?? []).map((opt: any, i: number) => (
                  <div key={i} className="flex gap-1.5">
                    <input value={opt.label} onChange={e => {
                      const opts = [...(selectedNode.data.options ?? [])];
                      opts[i] = { ...opts[i], label: e.target.value };
                      updateSelectedNode("options", opts);
                    }} placeholder={`Opção ${i + 1}`} className="flex-1 h-7 px-2 rounded-lg text-xs text-white outline-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
                    <button onClick={() => {
                      const opts = (selectedNode.data.options ?? []).filter((_: any, idx: number) => idx !== i);
                      updateSelectedNode("options", opts);
                    }} className="text-[10px] px-1.5" style={{ color: "rgba(248,113,113,0.5)" }}>✕</button>
                  </div>
                ))}
                <p className="text-[9px]" style={{ color: "rgba(147,157,164,0.4)" }}>
                  Cada opção cria uma saída. Conecte cada saída ao próximo nó.
                </p>
              </div>
            </>)}

            {selectedNode.type === "ask" && (<>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Pergunta</label>
                <input value={selectedNode.data.question ?? ""} onChange={e => updateSelectedNode("question", e.target.value)}
                  className="w-full h-8 px-2 rounded-lg text-xs text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Salvar como</label>
                <input value={selectedNode.data.save_as ?? ""} onChange={e => updateSelectedNode("save_as", e.target.value)}
                  placeholder="nome, email, telefone..." className="w-full h-8 px-2 rounded-lg text-xs text-white outline-none font-mono"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
            </>)}

            {selectedNode.type === "ai_response" && (<>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Instruções</label>
                <textarea value={selectedNode.data.context_prompt ?? ""} onChange={e => updateSelectedNode("context_prompt", e.target.value)} rows={3}
                  placeholder="Ex: Foque em resolver problemas técnicos..."
                  className="w-full p-2 rounded-lg text-xs text-white outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Máx tentativas</label>
                <input type="number" min={1} max={5} value={selectedNode.data.max_tentativas ?? 2} onChange={e => updateSelectedNode("max_tentativas", parseInt(e.target.value))}
                  className="w-full h-8 px-2 rounded-lg text-xs text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={selectedNode.data.usar_kb ?? true} onChange={e => updateSelectedNode("usar_kb", e.target.checked)} />
                <span className="text-xs" style={{ color: "#939da4" }}>Usar base de conhecimento</span>
              </label>
              <div className="rounded-lg p-2" style={{ background: "rgba(154,234,98,0.04)", border: "1px solid rgba(154,234,98,0.1)" }}>
                <p className="text-[9px] font-bold mb-1" style={{ color: "#9aea62" }}>Conecte as saídas:</p>
                {["resolvido","nao_sei","humano","comercial","suporte","default"].map(h => (
                  <p key={h} className="text-[9px] font-mono" style={{ color: "#939da4" }}>→ {h}</p>
                ))}
              </div>
            </>)}

            {selectedNode.type === "condition" && (<>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Campo a verificar</label>
                <input value={selectedNode.data.field ?? ""} onChange={e => updateSelectedNode("field", e.target.value)}
                  placeholder="nome, email, resposta..." className="w-full h-8 px-2 rounded-lg text-xs text-white outline-none font-mono"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Tipo</label>
                <select value={selectedNode.data.condition_type ?? "is_not_empty"} onChange={e => updateSelectedNode("condition_type", e.target.value)}
                  className="w-full h-8 px-2 rounded-lg text-xs outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}>
                  <option value="is_not_empty" style={{ background: "#111" }}>Está preenchido</option>
                  <option value="is_empty" style={{ background: "#111" }}>Está vazio</option>
                  <option value="equals" style={{ background: "#111" }}>É igual a...</option>
                  <option value="contains" style={{ background: "#111" }}>Contém...</option>
                </select>
              </div>
              {["equals","contains"].includes(selectedNode.data.condition_type) && (
                <input value={selectedNode.data.condition_value ?? ""} onChange={e => updateSelectedNode("condition_value", e.target.value)}
                  placeholder="valor para comparar" className="w-full h-8 px-2 rounded-lg text-xs text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              )}
            </>)}

            {selectedNode.type === "transfer" && (<>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Departamento</label>
                <select value={selectedNode.data.departamento ?? "vendas"} onChange={e => updateSelectedNode("departamento", e.target.value)}
                  className="w-full h-8 px-2 rounded-lg text-xs outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}>
                  <option value="vendas" style={{ background: "#111" }}>Vendas</option>
                  <option value="suporte" style={{ background: "#111" }}>Suporte</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Mensagem antes</label>
                <input value={selectedNode.data.message ?? ""} onChange={e => updateSelectedNode("message", e.target.value)}
                  placeholder="Vou conectar com nossa equipe..." className="w-full h-8 px-2 rounded-lg text-xs text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
            </>)}

            {selectedNode.type === "end" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Mensagem final</label>
                <input value={selectedNode.data.message ?? ""} onChange={e => updateSelectedNode("message", e.target.value)}
                  placeholder="Obrigado! Até logo." className="w-full h-8 px-2 rounded-lg text-xs text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
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
