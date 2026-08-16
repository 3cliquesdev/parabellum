"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Pipeline } from "@/types/database";

interface MembroEquipe {
  id: string;
  user_id: string | null;
  email: string | null;
}

interface BulkActionsBarProps {
  tenantId: string;
  selecionados: string[];
  pipelines: Pipeline[];
  onLimpar: () => void;
  onConcluido: () => void;
}

const buttonStyle: React.CSSProperties = {
  background: "var(--ghost-bg)",
  color: "var(--text-secondary)",
  border: "1px solid var(--chip-border)",
};

export function BulkActionsBar({ tenantId, selecionados, pipelines, onLimpar, onConcluido }: BulkActionsBarProps) {
  const [enviando, setEnviando] = useState(false);
  const [menuAberto, setMenuAberto] = useState<"mover" | "transferir" | "perder" | null>(null);
  const [pipelineDestino, setPipelineDestino] = useState("");
  const [motivoPerda, setMotivoPerda] = useState("");
  const [vendedorDestino, setVendedorDestino] = useState("");
  const [equipe, setEquipe] = useState<MembroEquipe[]>([]);

  useEffect(() => {
    fetch(`/api/team/members?tenant_id=${tenantId}`)
      .then((r) => (r.ok ? r.json() : { members: [] }))
      .then((d) => setEquipe(d.members ?? []));
  }, [tenantId]);

  async function executar(body: Record<string, unknown>) {
    setEnviando(true);
    const res = await fetch("/api/negocios/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, ids: selecionados, ...body }),
    });
    setEnviando(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Erro ao executar ação em massa");
      return;
    }
    setMenuAberto(null);
    onConcluido();
  }

  async function excluir() {
    if (!window.confirm(`Excluir ${selecionados.length} negócio(s)? Essa ação não pode ser desfeita.`)) return;
    await executar({ acao: "excluir" });
  }

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-3 rounded-2xl"
      style={{ background: "var(--surface-solid)", border: "1px solid var(--border-subtle)", boxShadow: "0 16px 48px rgba(0,0,0,0.18)" }}
    >
      <span className="text-xs font-bold px-2" style={{ color: "var(--text-primary)" }}>
        {selecionados.length} selecionado{selecionados.length > 1 ? "s" : ""}
      </span>

      <div className="relative">
        <button disabled={enviando} onClick={() => setMenuAberto((m) => (m === "mover" ? null : "mover"))}
          className="px-3 py-2 rounded-xl text-xs font-bold" style={buttonStyle}>
          Mover para Pipeline
        </button>
        {menuAberto === "mover" && (
          <div className="absolute bottom-full mb-2 left-0 w-64 rounded-xl p-3 space-y-2"
            style={{ background: "var(--surface-solid)", border: "1px solid var(--border-subtle)" }}>
            <select value={pipelineDestino} onChange={(e) => setPipelineDestino(e.target.value)}
              className="w-full h-9 px-2 rounded-lg text-xs outline-none"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}>
              <option value="" style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>Selecione um pipeline...</option>
              {pipelines.map((p) => (
                <option key={p.id} value={p.id} style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>{p.nome}</option>
              ))}
            </select>
            <button disabled={!pipelineDestino || enviando}
              onClick={() => executar({ acao: "mover_pipeline", pipeline_id: pipelineDestino })}
              className="w-full h-8 rounded-lg text-xs font-bold"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: !pipelineDestino || enviando ? 0.6 : 1 }}>
              Mover
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <button disabled={enviando} onClick={() => setMenuAberto((m) => (m === "transferir" ? null : "transferir"))}
          className="px-3 py-2 rounded-xl text-xs font-bold" style={buttonStyle}>
          Transferir para Vendedor
        </button>
        {menuAberto === "transferir" && (
          <div className="absolute bottom-full mb-2 left-0 w-64 rounded-xl p-3 space-y-2"
            style={{ background: "var(--surface-solid)", border: "1px solid var(--border-subtle)" }}>
            <select value={vendedorDestino} onChange={(e) => setVendedorDestino(e.target.value)}
              className="w-full h-9 px-2 rounded-lg text-xs outline-none"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}>
              <option value="" style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>Selecione um vendedor...</option>
              {equipe.map((m) => (
                <option key={m.id} value={m.user_id ?? ""} style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>{m.email}</option>
              ))}
            </select>
            <button disabled={!vendedorDestino || enviando}
              onClick={() => executar({ acao: "transferir_vendedor", assigned_to: vendedorDestino })}
              className="w-full h-8 rounded-lg text-xs font-bold"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: !vendedorDestino || enviando ? 0.6 : 1 }}>
              Transferir
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <button disabled={enviando} onClick={() => setMenuAberto((m) => (m === "perder" ? null : "perder"))}
          className="px-3 py-2 rounded-xl text-xs font-bold" style={buttonStyle}>
          Marcar como Perdido
        </button>
        {menuAberto === "perder" && (
          <div className="absolute bottom-full mb-2 left-0 w-64 rounded-xl p-3 space-y-2"
            style={{ background: "var(--surface-solid)", border: "1px solid var(--border-subtle)" }}>
            <input value={motivoPerda} onChange={(e) => setMotivoPerda(e.target.value)}
              placeholder="Motivo da perda (opcional)"
              className="w-full h-9 px-2 rounded-lg text-xs outline-none"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} />
            <button disabled={enviando}
              onClick={() => executar({ acao: "marcar_perdido", motivo_perda: motivoPerda || null })}
              className="w-full h-8 rounded-lg text-xs font-bold"
              style={{ background: "#dc2626", color: "#fff", opacity: enviando ? 0.6 : 1 }}>
              Confirmar
            </button>
          </div>
        )}
      </div>

      <button disabled={enviando} onClick={excluir}
        className="px-3 py-2 rounded-xl text-xs font-bold" style={{ color: "#dc2626", background: "rgba(220,38,38,0.08)" }}>
        Excluir
      </button>

      <button onClick={onLimpar} className="w-8 h-8 rounded-xl flex items-center justify-center ml-1" style={buttonStyle}>
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
