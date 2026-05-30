"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactFlow, {
  Background, Controls, MiniMap, addEdge,
  useNodesState, useEdgesState, type Connection,
  type Node, type Edge, MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { ArrowLeft, Save, Plus } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";

// ─── Node Colors ───
const NODE_COLORS: Record<string, string> = {
  start:       "#939da4",
  message:     "#60a5fa",
  ask:         "#a78bfa",
  ai_response: "#9aea62",
  condition:   "#facc15",
  transfer:    "#fb923c",
  end:         "#f87171",
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

// ─── Custom node rendering ───
function FlowNode({ data, type }: { data: any; type: string }) {
  const color = NODE_COLORS[type ?? "message"] ?? "#939da4";
  return (
    <div className="rounded-xl px-4 py-3 min-w-[160px] max-w-[220px]"
      style={{ background: "linear-gradient(180deg, rgba(28,28,28,0.95) 0%, rgba(18,18,18,1) 100%)", border: `2px solid ${color}40`, boxShadow: `0 0 12px ${color}20` }}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color }}>{NODE_LABELS[type ?? "message"]}</p>
      </div>
      <p className="text-xs text-white truncate">{data.label || data.text || data.question || (type === "ai_response" ? "IA responde..." : "...")}</p>
      {data.trigger_keywords?.length > 0 && (
        <p className="text-[9px] mt-1 truncate" style={{ color: "#939da4" }}>🔑 {data.trigger_keywords.slice(0, 2).join(", ")}</p>
      )}
    </div>
  );
}

const nodeTypes = {
  start:       (p: any) => <FlowNode {...p} type="start" />,
  message:     (p: any) => <FlowNode {...p} type="message" />,
  ask:         (p: any) => <FlowNode {...p} type="ask" />,
  ai_response: (p: any) => <FlowNode {...p} type="ai_response" />,
  condition:   (p: any) => <FlowNode {...p} type="condition" />,
  transfer:    (p: any) => <FlowNode {...p} type="transfer" />,
  end:         (p: any) => <FlowNode {...p} type="end" />,
};

const NODE_PALETTE = [
  { type: "message",     label: "Mensagem",     desc: "Envia texto para o lead" },
  { type: "ask",         label: "Coletar Info", desc: "Pergunta e salva resposta" },
  { type: "ai_response", label: "IA Responde",  desc: "Gemini tenta resolver" },
  { type: "condition",   label: "Condição",     desc: "Bifurca baseado em dados" },
  { type: "transfer",    label: "Transferir",   desc: "Handoff para humano" },
  { type: "end",         label: "Finalizar",    desc: "Encerra o fluxo" },
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
    if (!flowId || flowId === "new") return;
    fetch(`/api/flows?tenant_id=${tenantId ?? ""}`).then(r => r.json()).then(d => {
      const f = (d.flows ?? []).find((x: any) => x.id === flowId);
      if (!f) return;
      setFlow(f);
      setNome(f.nome);
      setKeywords((f.trigger_keywords ?? []).join(", "));
      const fd = f.flow_definition ?? { nodes: [], edges: [] };
      setNodes(fd.nodes ?? []);
      setEdges(fd.edges ?? []);
    });
  }, [flowId, tenantId]);

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge({ ...connection, markerEnd: { type: MarkerType.ArrowClosed, color: "#9aea62" }, style: { stroke: "#9aea62", strokeWidth: 1.5 } }, eds));
  }, [setEdges]);

  function addNode(type: string) {
    const id = `${type}-${Date.now()}`;
    const newNode: Node = {
      id, type,
      position: { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 },
      data: { label: NODE_LABELS[type] },
    };
    setNodes(ns => [...ns, newNode]);
  }

  async function save() {
    if (!flowId || flowId === "new") return;
    setSaving(true);
    await fetch("/api/flows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flow_id: flowId,
        nome,
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
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-bold"
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
            placeholder="oi, olá, bom dia..."
            className="w-full h-8 px-2.5 rounded-lg text-xs text-white outline-none mb-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />

          <p className="section-label mb-2 px-1">Adicionar nó</p>
          {NODE_PALETTE.map(n => (
            <button key={n.type} onClick={() => addNode(n.type)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all group"
              style={{ border: "1px solid transparent" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
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
            fitView
            style={{ background: "#000" }}>
            <Background color="rgba(255,255,255,0.05)" gap={24} />
            <Controls style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)" }} />
            <MiniMap style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)" }} nodeColor={n => NODE_COLORS[n.type ?? ""] ?? "#939da4"} />
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

            {(selectedNode.type === "message") && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Texto da mensagem</label>
                <textarea value={selectedNode.data.text ?? ""} onChange={e => updateSelectedNode("text", e.target.value)} rows={4}
                  className="w-full p-2 rounded-lg text-xs text-white outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
            )}

            {(selectedNode.type === "ask") && (<>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Pergunta</label>
                <input value={selectedNode.data.question ?? ""} onChange={e => updateSelectedNode("question", e.target.value)}
                  className="w-full h-8 px-2 rounded-lg text-xs text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Salvar como (variável)</label>
                <input value={selectedNode.data.save_as ?? ""} onChange={e => updateSelectedNode("save_as", e.target.value)}
                  placeholder="nome, email, telefone..." className="w-full h-8 px-2 rounded-lg text-xs text-white outline-none font-mono"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
            </>)}

            {(selectedNode.type === "ai_response") && (<>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Instruções específicas</label>
                <textarea value={selectedNode.data.context_prompt ?? ""} onChange={e => updateSelectedNode("context_prompt", e.target.value)} rows={3}
                  placeholder="Ex: Foque em resolver problemas técnicos..."
                  className="w-full p-2 rounded-lg text-xs text-white outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Máximo de tentativas</label>
                <input type="number" min={1} max={5} value={selectedNode.data.max_tentativas ?? 2} onChange={e => updateSelectedNode("max_tentativas", parseInt(e.target.value))}
                  className="w-full h-8 px-2 rounded-lg text-xs text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={selectedNode.data.usar_kb ?? true} onChange={e => updateSelectedNode("usar_kb", e.target.checked)} />
                <span className="text-xs" style={{ color: "#939da4" }}>Usar base de conhecimento</span>
              </label>
              <div className="rounded-lg p-2 space-y-1" style={{ background: "rgba(154,234,98,0.04)", border: "1px solid rgba(154,234,98,0.1)" }}>
                <p className="text-[9px] font-bold" style={{ color: "#9aea62" }}>Saídas disponíveis:</p>
                {["resolvido","nao_sei","humano","comercial","suporte","default"].map(h => (
                  <p key={h} className="text-[9px] font-mono" style={{ color: "#939da4" }}>→ {h}</p>
                ))}
              </div>
            </>)}

            {(selectedNode.type === "transfer") && (<>
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
                <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Mensagem antes de transferir</label>
                <input value={selectedNode.data.message ?? ""} onChange={e => updateSelectedNode("message", e.target.value)}
                  placeholder="Vou conectar você com nossa equipe..."
                  className="w-full h-8 px-2 rounded-lg text-xs text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
            </>)}

            {(selectedNode.type === "end") && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold" style={{ color: "#939da4" }}>Mensagem final (opcional)</label>
                <input value={selectedNode.data.message ?? ""} onChange={e => updateSelectedNode("message", e.target.value)}
                  placeholder="Obrigado! Até logo."
                  className="w-full h-8 px-2 rounded-lg text-xs text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
            )}

            <button onClick={() => { setNodes(ns => ns.filter(n => n.id !== selectedNode.id)); setSelectedNode(null); }}
              className="mt-2 w-full h-8 rounded-xl text-xs font-medium"
              style={{ background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.15)" }}>
              Remover nó
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
