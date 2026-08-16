"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Pipeline } from "@/types/database";

interface MembroEquipe {
  id: string;
  user_id: string;
  email: string | null;
}

interface TransferirCarteiraModalProps {
  tenantId: string;
  pipelines: Pipeline[];
  onClose: () => void;
  onConcluido: () => void;
}

const inputStyle: React.CSSProperties = {
  background: "var(--input-bg)",
  border: "1px solid var(--input-border)",
  color: "var(--text-primary)",
};

export function TransferirCarteiraModal({ tenantId, pipelines, onClose, onConcluido }: TransferirCarteiraModalProps) {
  const [equipe, setEquipe] = useState<MembroEquipe[]>([]);
  const [deUserId, setDeUserId] = useState("");
  const [paraUserId, setParaUserId] = useState("");
  const [pipelineId, setPipelineId] = useState("");
  const [preview, setPreview] = useState<{ quantidade: number; valor_total: number } | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch(`/api/team/members?tenant_id=${tenantId}`)
      .then((r) => (r.ok ? r.json() : { members: [] }))
      .then((d) => setEquipe(d.members ?? []));
  }, [tenantId]);

  useEffect(() => {
    function limparPreview() {
      setPreview(null);
    }
    if (!deUserId) { limparPreview(); return; }
    const params = new URLSearchParams({ tenant_id: tenantId, de_user_id: deUserId });
    if (pipelineId) params.set("pipeline_id", pipelineId);
    fetch(`/api/negocios/transferir-carteira?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setPreview);
  }, [tenantId, deUserId, pipelineId]);

  async function confirmar() {
    setEnviando(true);
    const res = await fetch("/api/negocios/transferir-carteira", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, de_user_id: deUserId, para_user_id: paraUserId, pipeline_id: pipelineId || null }),
    });
    setEnviando(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Erro ao transferir carteira");
      return;
    }
    onConcluido();
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "var(--scrim)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl p-5" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Transferir Carteira</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--input-bg)", color: "var(--text-secondary)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>De (origem)</label>
              <select value={deUserId} onChange={(e) => setDeUserId(e.target.value)} className="w-full h-9 px-2 rounded-lg text-xs outline-none" style={inputStyle}>
                <option value="" style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>Selecione o vendedor origem</option>
                {equipe.map((m) => <option key={m.id} value={m.user_id} style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>{m.email}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Para (destino)</label>
              <select value={paraUserId} onChange={(e) => setParaUserId(e.target.value)} className="w-full h-9 px-2 rounded-lg text-xs outline-none" style={inputStyle}>
                <option value="" style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>Selecione o vendedor destino</option>
                {equipe.filter((m) => m.user_id !== deUserId).map((m) => <option key={m.id} value={m.user_id} style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>{m.email}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Pipeline (opcional)</label>
              <select value={pipelineId} onChange={(e) => setPipelineId(e.target.value)} className="w-full h-9 px-2 rounded-lg text-xs outline-none" style={inputStyle}>
                <option value="" style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>Todos os pipelines</option>
                {pipelines.map((p) => <option key={p.id} value={p.id} style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>{p.nome}</option>)}
              </select>
            </div>

            {preview && (
              <p className="text-xs font-semibold" style={{ color: "var(--status-ganho)" }}>
                {preview.quantidade} negócio(s) abertos · R$ {preview.valor_total.toLocaleString("pt-BR")} serão transferidos
              </p>
            )}
          </div>

          <div className="flex gap-2 mt-5">
            <button onClick={onClose} className="flex-1 h-9 rounded-lg text-sm font-medium" style={{ background: "var(--input-bg)", color: "var(--text-secondary)" }}>Cancelar</button>
            <button onClick={confirmar} disabled={!deUserId || !paraUserId || enviando}
              className="flex-1 h-9 rounded-lg text-sm font-bold"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: !deUserId || !paraUserId || enviando ? 0.6 : 1 }}>
              {enviando ? "Transferindo..." : "Transferir"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
