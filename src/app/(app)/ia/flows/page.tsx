"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, GitBranch, Zap, Edit2, Trash2, ToggleLeft, ToggleRight, Crown } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";

const DEPT_COLOR: Record<string, string> = { vendas: "#9aea62", suporte: "#60a5fa", todos: "#a78bfa" };

export default function FlowsPage() {
  const { tenantId } = useTenant();
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  useEffect(() => {
    if (!tenantId) return;
    fetch(`/api/flows?tenant_id=${tenantId}`).then(r => r.json()).then(d => { setFlows(d.flows ?? []); setLoading(false); });
  }, [tenantId]);

  async function toggleAtivo(flow: any) {
    await fetch("/api/flows", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flow_id: flow.id, ativo: !flow.ativo }) });
    setFlows(f => f.map(x => x.id === flow.id ? { ...x, ativo: !x.ativo } : x));
  }

  async function deleteFlow(id: string) {
    if (!confirm("Excluir este fluxo?")) return;
    await fetch("/api/flows", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flow_id: id }) });
    setFlows(f => f.filter(x => x.id !== id));
  }

  async function toggleMaster(flow: any) {
    // Desativar master atual (se houver) e ativar o novo
    const newIsMaster = !flow.is_master;
    if (newIsMaster) {
      // Remove master dos outros
      for (const f of flows) {
        if (f.is_master && f.id !== flow.id) {
          await fetch("/api/flows", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flow_id: f.id, is_master: false }) });
        }
      }
      setFlows(f => f.map(x => ({ ...x, is_master: x.id === flow.id })));
    } else {
      setFlows(f => f.map(x => x.id === flow.id ? { ...x, is_master: false } : x));
    }
    await fetch("/api/flows", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flow_id: flow.id, is_master: newIsMaster }) });
  }

  async function createDefault() {
    if (!tenantId) return;
    const defaults = [
      { nome: "Boas-vindas", descricao: "Recebe o lead e oferece opções", trigger_keywords: ["oi", "ola", "bom dia", "boa tarde", "boa noite"], departamento: "todos" },
      { nome: "Suporte Técnico", descricao: "IA tenta resolver antes de transferir", trigger_keywords: ["problema", "erro", "nao funciona", "ajuda", "suporte"], departamento: "suporte" },
      { nome: "Vendas e Preços", descricao: "Qualifica leads comerciais", trigger_keywords: ["preco", "valor", "quanto custa", "plano", "contratar"], departamento: "vendas" },
    ];
    for (const d of defaults) {
      await fetch("/api/flows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...d, tenant_id: tenantId }) });
    }
    fetch(`/api/flows?tenant_id=${tenantId}`).then(r => r.json()).then(d => setFlows(d.flows ?? []));
  }

  return (
    <div className="p-8 space-y-6" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Chat Flows</h1>
          <p className="text-sm mt-1" style={{ color: "#939da4" }}>
            Defina como a IA se comporta — ela tenta resolver antes de transferir
          </p>
        </div>
        <div className="flex gap-2">
          {flows.length === 0 && (
            <button onClick={createDefault} className="px-4 h-9 rounded-xl text-sm font-bold"
              style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62", border: "1px solid rgba(154,234,98,0.2)" }}>
              Criar fluxos padrão
            </button>
          )}
          <Link href="/ia/flows/new" className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold"
            style={{ background: "#9aea62", color: "#0a0a0a" }}>
            <Plus className="w-4 h-4" /> Novo fluxo
          </Link>
        </div>
      </div>

      {/* Explicação */}
      <div className="rounded-xl p-4" style={{ background: "rgba(154,234,98,0.04)", border: "1px solid rgba(154,234,98,0.12)" }}>
        <p className="text-xs font-bold mb-1" style={{ color: "#9aea62" }}>Como funciona</p>
        <p className="text-xs" style={{ color: "#939da4" }}>
          Quando um lead manda uma mensagem, o sistema verifica se alguma keyword ativa um fluxo.
          Dentro do fluxo, a IA tenta resolver o problema — só transfere para humano quando o fluxo mandar.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>
      ) : flows.length === 0 ? (
        <div className="py-20 text-center rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <GitBranch className="w-12 h-12 mx-auto mb-4" style={{ color: "rgba(147,157,164,0.3)" }} />
          <p className="text-sm font-medium text-white mb-1">Nenhum fluxo ainda</p>
          <p className="text-xs mb-4" style={{ color: "#939da4" }}>Crie fluxos para controlar como a IA responde</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flows.map(flow => {
            const deptColor = DEPT_COLOR[flow.departamento] ?? "#939da4";
            return (
              <div key={flow.id} className="rounded-2xl p-5" style={cardStyle}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${deptColor}15` }}>
                      <GitBranch className="w-5 h-5" style={{ color: deptColor }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-bold text-white">{flow.nome}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize"
                          style={{ color: deptColor, background: `${deptColor}15` }}>{flow.departamento}</span>
                        {flow.is_master && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(250,204,21,0.15)", color: "#facc15" }}>
                            <Crown className="w-2.5 h-2.5" /> Master
                          </span>
                        )}
                        {!flow.ativo && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>Inativo</span>}
                      </div>
                      {flow.descricao && <p className="text-xs mb-2" style={{ color: "#939da4" }}>{flow.descricao}</p>}
                      {(flow.trigger_keywords ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          <Zap className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "#939da4" }} />
                          {(flow.trigger_keywords ?? []).slice(0, 5).map((kw: string) => (
                            <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                              style={{ background: "rgba(255,255,255,0.06)", color: "#939da4" }}>"{kw}"</span>
                          ))}
                          {(flow.trigger_keywords ?? []).length > 5 && (
                            <span className="text-[10px]" style={{ color: "#939da4" }}>+{flow.trigger_keywords.length - 5}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <button onClick={() => toggleMaster(flow)} title={flow.is_master ? "Remover como Master" : "Definir como Master Flow"}>
                      <Crown className="w-4 h-4" style={{ color: flow.is_master ? "#facc15" : "rgba(147,157,164,0.3)" }} />
                    </button>
                    <button onClick={() => toggleAtivo(flow)}>
                      {flow.ativo
                        ? <ToggleRight className="w-5 h-5" style={{ color: "#9aea62" }} />
                        : <ToggleLeft className="w-5 h-5" style={{ color: "#939da4" }} />}
                    </button>
                    <Link href={`/ia/flows/${flow.id}/edit`}><Edit2 className="w-4 h-4" style={{ color: "#939da4" }} /></Link>
                    <button onClick={() => deleteFlow(flow.id)}><Trash2 className="w-4 h-4" style={{ color: "rgba(248,113,113,0.5)" }} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
