"use client";

import { useState } from "react";
import { X, History, ChevronDown, ChevronUp } from "lucide-react";
import type { Negocio, Pipeline } from "@/types/database";
import { NegocioTimeline } from "./NegocioTimeline";

interface NegocioSheetProps {
  negocio: Negocio;
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

export function NegocioSheet({ negocio, tenantId, pipelines, onClose, onAtualizado }: NegocioSheetProps) {
  const [saving, setSaving] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  const [form, setForm] = useState({
    titulo: negocio.titulo,
    valor: negocio.valor?.toString() ?? "",
    pipeline_id: negocio.pipeline_id ?? "",
    pipeline_etapa_id: negocio.pipeline_etapa_id ?? "",
    motivo_perda: negocio.motivo_perda ?? "",
  });

  const pipelineSelecionado = pipelines.find((p) => p.id === form.pipeline_id);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/negocios/${negocio.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenantId,
        titulo: form.titulo,
        valor: form.valor ? Number(form.valor) : null,
        pipeline_id: form.pipeline_id || null,
        pipeline_etapa_id: form.pipeline_etapa_id || null,
        motivo_perda: form.motivo_perda || null,
      }),
    });
    setSaving(false);
    if (!res.ok) { alert("Erro ao salvar negócio"); return; }
    onAtualizado();
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "var(--scrim)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-md flex flex-col"
        style={{ background: "var(--bg-subtle)", borderLeft: "1px solid var(--border-subtle)", boxShadow: "-24px 0 80px rgba(0,0,0,0.2)" }}>

        <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{negocio.titulo}</h2>
            {negocio.leads?.nome && <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{negocio.leads.nome}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--input-bg)", color: "var(--text-secondary)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Título</label>
            <input value={form.titulo} onChange={(e) => set("titulo", e.target.value)}
              className="w-full h-9 px-3 rounded-lg text-sm outline-none" style={inputStyle} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Valor (R$)</label>
            <input type="number" value={form.valor} onChange={(e) => set("valor", e.target.value)}
              className="w-full h-9 px-3 rounded-lg text-sm outline-none" style={inputStyle} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Pipeline</label>
            <select value={form.pipeline_id} onChange={(e) => set("pipeline_id", e.target.value)}
              className="w-full h-9 px-3 rounded-lg text-sm outline-none" style={inputStyle}>
              {pipelines.map((p) => (
                <option key={p.id} value={p.id} style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Etapa</label>
            <select value={form.pipeline_etapa_id} onChange={(e) => set("pipeline_etapa_id", e.target.value)}
              className="w-full h-9 px-3 rounded-lg text-sm outline-none" style={inputStyle}>
              {[...(pipelineSelecionado?.pipeline_etapas ?? [])].sort((a, b) => a.posicao - b.posicao).map((etapa) => (
                <option key={etapa.id} value={etapa.id} style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>{etapa.nome}</option>
              ))}
            </select>
          </div>

          {negocio.estagio === "perdido" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Motivo da perda</label>
              <textarea value={form.motivo_perda} onChange={(e) => set("motivo_perda", e.target.value)}
                rows={3} className="w-full rounded-lg text-sm p-3 resize-none outline-none" style={inputStyle} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            {negocio.canal && <p>Canal: <span style={{ color: "var(--text-primary)" }}>{negocio.canal}</span></p>}
            {negocio.origem && <p>Origem: <span style={{ color: "var(--text-primary)" }}>{negocio.origem}</span></p>}
          </div>

          <div className="pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <button className="w-full flex items-center justify-between py-2 text-left" onClick={() => setShowTimeline((v) => !v)}>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                <History className="inline w-3 h-3 mr-1.5 mb-0.5" />Timeline
              </span>
              {showTimeline
                ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />
                : <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />}
            </button>
            {showTimeline && (
              <div className="mt-1">
                <NegocioTimeline negocioId={negocio.id} tenantId={tenantId} />
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <button onClick={handleSave} disabled={saving}
            className="w-full h-9 rounded-lg text-sm font-bold flex items-center justify-center"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </div>
    </>
  );
}
