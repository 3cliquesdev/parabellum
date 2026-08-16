"use client";

import { useState } from "react";
import { X, Plus, Trash2, Star, ChevronUp, ChevronDown } from "lucide-react";
import type { Pipeline } from "@/types/database";

interface GerenciarPipelinesModalProps {
  tenantId: string;
  pipelines: Pipeline[];
  onClose: () => void;
  onAtualizado: () => void;
}

const inputStyle: React.CSSProperties = {
  background: "var(--input-bg)",
  border: "1px solid var(--input-border)",
  color: "var(--text-primary)",
};

export function GerenciarPipelinesModal({ tenantId, pipelines, onClose, onAtualizado }: GerenciarPipelinesModalProps) {
  const [pipelineAberto, setPipelineAberto] = useState<string | null>(pipelines[0]?.id ?? null);
  const [novoPipelineNome, setNovoPipelineNome] = useState("");
  const [novaEtapaNome, setNovaEtapaNome] = useState("");
  const [salvando, setSalvando] = useState(false);

  const pipeline = pipelines.find((p) => p.id === pipelineAberto);

  async function criarPipeline() {
    if (!novoPipelineNome.trim()) return;
    setSalvando(true);
    const res = await fetch("/api/pipelines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, nome: novoPipelineNome.trim() }),
    });
    setSalvando(false);
    if (!res.ok) { alert("Erro ao criar pipeline"); return; }
    setNovoPipelineNome("");
    onAtualizado();
  }

  async function excluirPipeline(id: string) {
    if (!window.confirm("Excluir esse pipeline? Só é possível se ele não tiver negócios.")) return;
    const res = await fetch(`/api/pipelines/${id}?tenant_id=${tenantId}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Erro ao excluir pipeline");
      return;
    }
    onAtualizado();
  }

  async function marcarPadrao(id: string) {
    await fetch(`/api/pipelines/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, is_default: true }),
    });
    onAtualizado();
  }

  async function criarEtapa() {
    if (!pipeline || !novaEtapaNome.trim()) return;
    setSalvando(true);
    const res = await fetch(`/api/pipelines/${pipeline.id}/etapas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, nome: novaEtapaNome.trim() }),
    });
    setSalvando(false);
    if (!res.ok) { alert("Erro ao criar etapa"); return; }
    setNovaEtapaNome("");
    onAtualizado();
  }

  async function renomearEtapa(etapaId: string, nome: string) {
    if (!pipeline) return;
    await fetch(`/api/pipelines/${pipeline.id}/etapas/${etapaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, nome }),
    });
    onAtualizado();
  }

  async function moverEtapa(etapaId: string, direcao: -1 | 1) {
    if (!pipeline) return;
    const etapas = [...pipeline.pipeline_etapas].sort((a, b) => a.posicao - b.posicao);
    const idx = etapas.findIndex((e) => e.id === etapaId);
    const alvo = etapas[idx + direcao];
    if (!alvo) return;
    const atual = etapas[idx];

    await Promise.all([
      fetch(`/api/pipelines/${pipeline.id}/etapas/${atual.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, posicao: alvo.posicao }),
      }),
      fetch(`/api/pipelines/${pipeline.id}/etapas/${alvo.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, posicao: atual.posicao }),
      }),
    ]);
    onAtualizado();
  }

  async function alternarFlag(etapaId: string, flag: "e_ganho" | "e_perdido", valor: boolean) {
    if (!pipeline) return;
    await fetch(`/api/pipelines/${pipeline.id}/etapas/${etapaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, [flag]: valor }),
    });
    onAtualizado();
  }

  async function excluirEtapa(etapaId: string) {
    if (!pipeline) return;
    if (!window.confirm("Excluir essa etapa? Só é possível se ela não tiver negócios.")) return;
    const res = await fetch(`/api/pipelines/${pipeline.id}/etapas/${etapaId}?tenant_id=${tenantId}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Erro ao excluir etapa");
      return;
    }
    onAtualizado();
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "var(--scrim)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-2xl flex overflow-hidden" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-subtle)", height: "560px" }}>

          {/* Lista de pipelines */}
          <div className="w-64 shrink-0 flex flex-col" style={{ borderRight: "1px solid var(--border-subtle)" }}>
            <div className="p-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Pipelines</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {pipelines.map((p) => (
                <button key={p.id} onClick={() => setPipelineAberto(p.id)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-xs font-semibold"
                  style={{
                    background: pipelineAberto === p.id ? "var(--active-soft-bg)" : "transparent",
                    color: pipelineAberto === p.id ? "var(--status-ganho)" : "var(--text-secondary)",
                  }}>
                  <span className="truncate flex items-center gap-1.5">
                    {p.is_default && <Star className="w-3 h-3 shrink-0" fill="currentColor" />}
                    {p.nome}
                  </span>
                  <span className="opacity-70 shrink-0">{p.total_negocios}</span>
                </button>
              ))}
            </div>
            <div className="p-3 space-y-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <input value={novoPipelineNome} onChange={(e) => setNovoPipelineNome(e.target.value)}
                placeholder="Nome do pipeline" className="w-full h-8 px-2 rounded-lg text-xs outline-none" style={inputStyle} />
              <button onClick={criarPipeline} disabled={!novoPipelineNome.trim() || salvando}
                className="w-full h-8 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: !novoPipelineNome.trim() || salvando ? 0.6 : 1 }}>
                <Plus className="w-3 h-3" /> Novo pipeline
              </button>
            </div>
          </div>

          {/* Etapas do pipeline selecionado */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="min-w-0">
                <h2 className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{pipeline?.nome ?? "Selecione um pipeline"}</h2>
                {pipeline && !pipeline.is_default && (
                  <button onClick={() => marcarPadrao(pipeline.id)} className="text-[11px] font-semibold mt-0.5" style={{ color: "var(--status-ganho)" }}>
                    Marcar como padrão
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {pipeline && (
                  <button onClick={() => excluirPipeline(pipeline.id)} title="Excluir pipeline"
                    className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: "#dc2626", background: "rgba(220,38,38,0.08)" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--input-bg)", color: "var(--text-secondary)" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {pipeline && [...pipeline.pipeline_etapas].sort((a, b) => a.posicao - b.posicao).map((etapa, i, arr) => (
                <div key={etapa.id} className="rounded-lg p-2.5 flex items-center gap-2" style={{ background: "var(--surface-panel)", border: "1px solid var(--border-subtle)" }}>
                  <div className="flex flex-col shrink-0">
                    <button disabled={i === 0} onClick={() => moverEtapa(etapa.id, -1)} style={{ color: "var(--text-faint)", opacity: i === 0 ? 0.3 : 1 }}>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button disabled={i === arr.length - 1} onClick={() => moverEtapa(etapa.id, 1)} style={{ color: "var(--text-faint)", opacity: i === arr.length - 1 ? 0.3 : 1 }}>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input defaultValue={etapa.nome} onBlur={(e) => e.target.value.trim() && e.target.value !== etapa.nome && renomearEtapa(etapa.id, e.target.value.trim())}
                    className="flex-1 min-w-0 h-8 px-2 rounded-lg text-xs outline-none" style={inputStyle} />
                  <label className="flex items-center gap-1 text-[10px] font-semibold shrink-0" style={{ color: "var(--status-ganho)" }}>
                    <input type="checkbox" checked={etapa.e_ganho} onChange={(e) => alternarFlag(etapa.id, "e_ganho", e.target.checked)} />
                    Ganho
                  </label>
                  <label className="flex items-center gap-1 text-[10px] font-semibold shrink-0" style={{ color: "#dc2626" }}>
                    <input type="checkbox" checked={etapa.e_perdido} onChange={(e) => alternarFlag(etapa.id, "e_perdido", e.target.checked)} />
                    Perdido
                  </label>
                  <button onClick={() => excluirEtapa(etapa.id)} className="shrink-0" style={{ color: "var(--text-faint)" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {pipeline && (
              <div className="p-3 flex gap-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                <input value={novaEtapaNome} onChange={(e) => setNovaEtapaNome(e.target.value)}
                  placeholder="Nome da nova etapa" className="flex-1 h-9 px-2 rounded-lg text-xs outline-none" style={inputStyle} />
                <button onClick={criarEtapa} disabled={!novaEtapaNome.trim() || salvando}
                  className="px-3 h-9 rounded-lg text-xs font-bold flex items-center gap-1"
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: !novaEtapaNome.trim() || salvando ? 0.6 : 1 }}>
                  <Plus className="w-3 h-3" /> Etapa
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
