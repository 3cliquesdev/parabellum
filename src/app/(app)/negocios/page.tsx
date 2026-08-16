"use client";

import { useState } from "react";
import { Plus, Settings, RefreshCw } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { usePipelines } from "@/hooks/usePipelines";
import { useNegocios } from "@/hooks/useNegocios";
import { NegocioKanbanBoard } from "@/components/app/negocios/NegocioKanbanBoard";
import { GerenciarPipelinesModal } from "@/components/app/negocios/GerenciarPipelinesModal";
import { NegocioSheet } from "@/components/app/negocios/NegocioSheet";
import { BulkActionsBar } from "@/components/app/negocios/BulkActionsBar";
import type { Negocio } from "@/types/database";

const selectStyle: React.CSSProperties = {
  background: "var(--input-bg)",
  border: "1px solid var(--input-border)",
  color: "var(--text-primary)",
};

export default function NegociosPage() {
  const { tenantId, loading: tenantLoading } = useTenant();
  const { pipelines, loading: pipelinesLoading, refetch: refetchPipelines } = usePipelines(tenantId);
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const pipelineAtual = pipelines.find((p) => p.id === pipelineId) ?? pipelines[0] ?? null;
  const { negocios, loading: negociosLoading, refetch: refetchNegocios } = useNegocios(tenantId, pipelineAtual?.id ?? null);

  const [showGerenciar, setShowGerenciar] = useState(false);
  const [negocioAberto, setNegocioAberto] = useState<Negocio | null>(null);
  const [selecionados, setSelecionados] = useState<string[]>([]);

  function toggleSelecionado(id: string) {
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function criarNegocio() {
    if (!tenantId || !pipelineAtual) return;
    const titulo = window.prompt("Título do negócio:");
    if (!titulo?.trim()) return;
    const leadId = window.prompt("ID do contato (lead) vinculado:");
    if (!leadId?.trim()) { alert("É necessário informar o lead vinculado."); return; }

    const res = await fetch("/api/negocios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, lead_id: leadId.trim(), titulo: titulo.trim(), pipeline_id: pipelineAtual.id }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Erro ao criar negócio");
      return;
    }
    refetchNegocios();
  }

  if (tenantLoading || pipelinesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 rounded-full animate-spin" style={{ border: "2px solid var(--border-subtle)", borderTopColor: "var(--status-ganho)" }} />
      </div>
    );
  }

  const totalPipeline = negocios.filter((n) => n.estagio !== "perdido" && n.valor).reduce((s, n) => s + Number(n.valor), 0);
  const ganhos = negocios.filter((n) => n.estagio === "ganho").length;
  const perdidos = negocios.filter((n) => n.estagio === "perdido").length;

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Negócios</h1>
          <p className="text-[13px] mt-0.5 font-medium" style={{ color: "var(--text-secondary)" }}>
            R$ {totalPipeline.toLocaleString("pt-BR")} no pipeline · {ganhos} ganhos · {perdidos} perdidos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { refetchPipelines(); refetchNegocios(); }}
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowGerenciar(true)}
            className="flex items-center gap-2 px-3 h-9 rounded-lg text-sm font-semibold"
            style={{ background: "var(--input-bg)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
            <Settings className="w-4 h-4" /> Gerenciar Pipelines
          </button>
          <button onClick={criarNegocio}
            className="flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-semibold"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
            <Plus className="w-4 h-4" /> Novo Negócio
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <select value={pipelineAtual?.id ?? ""} onChange={(e) => setPipelineId(e.target.value)}
          className="h-9 px-3 rounded-lg text-sm font-semibold outline-none" style={selectStyle}>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id} style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>{p.nome}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-h-0">
        {negociosLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 rounded-full animate-spin" style={{ border: "2px solid var(--border-subtle)", borderTopColor: "var(--status-ganho)" }} />
          </div>
        ) : pipelineAtual ? (
          <NegocioKanbanBoard
            pipeline={pipelineAtual}
            negocios={negocios}
            tenantId={tenantId!}
            selecionados={selecionados}
            onToggleSelecionado={toggleSelecionado}
            onNegocioAtualizado={refetchNegocios}
            onAbrirNegocio={setNegocioAberto}
          />
        ) : (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Nenhum pipeline encontrado.</p>
        )}
      </div>

      {showGerenciar && (
        <GerenciarPipelinesModal
          tenantId={tenantId!}
          pipelines={pipelines}
          onClose={() => setShowGerenciar(false)}
          onAtualizado={refetchPipelines}
        />
      )}

      {negocioAberto && (
        <NegocioSheet
          negocio={negocioAberto}
          tenantId={tenantId!}
          pipelines={pipelines}
          onClose={() => setNegocioAberto(null)}
          onAtualizado={() => { refetchNegocios(); setNegocioAberto(null); }}
        />
      )}

      {selecionados.length > 0 && (
        <BulkActionsBar
          tenantId={tenantId!}
          selecionados={selecionados}
          pipelines={pipelines}
          onLimpar={() => setSelecionados([])}
          onConcluido={() => { setSelecionados([]); refetchNegocios(); }}
        />
      )}
    </div>
  );
}
