"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDroppable, type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Negocio, Pipeline, PipelineEtapa } from "@/types/database";
import { NegocioCard } from "./NegocioCard";

function DroppableColuna({ etapa, children, isOver }: { etapa: PipelineEtapa; children: React.ReactNode; isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id: etapa.id });
  const cor = etapa.e_ganho ? "#10B981" : etapa.e_perdido ? "#f87171" : "var(--status-ganho)";
  return (
    <div ref={setNodeRef} className="flex-1 overflow-y-auto p-2.5 space-y-2 transition-colors"
      style={{ minHeight: "120px", background: isOver ? "var(--active-soft-bg)" : "transparent", borderRadius: "0 0 12px 12px" }}>
      {children}
      {isOver && <div className="rounded-xl" style={{ height: 2, background: cor }} />}
    </div>
  );
}

interface MembroEquipe {
  user_id: string | null;
  email: string | null;
}

interface NegocioKanbanBoardProps {
  pipeline: Pipeline;
  negocios: Negocio[];
  tenantId: string;
  equipe: MembroEquipe[];
  selecionados: string[];
  onToggleSelecionado: (id: string) => void;
  onNegocioAtualizado: () => void;
  onAbrirNegocio: (negocio: Negocio) => void;
}

// Quantas cards renderizar por coluna de cara - o resto so monta no DOM
// quando o usuario pede "carregar mais". Sem isso, uma coluna com centenas
// de negocios (conforme a base cresce) deixa o drag-and-drop do dnd-kit
// visivelmente travado, ja que cada item arrastavel recalcula posicao dos
// vizinhos a cada movimento do ponteiro.
const CARDS_POR_LOTE = 40;

export function NegocioKanbanBoard({ pipeline, negocios, tenantId, equipe, selecionados, onToggleSelecionado, onNegocioAtualizado, onAbrirNegocio }: NegocioKanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [limitesPorEtapa, setLimitesPorEtapa] = useState<Record<string, number>>({});

  const etapas = useMemo(() => [...pipeline.pipeline_etapas].sort((a, b) => a.posicao - b.posicao), [pipeline.pipeline_etapas]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const activeNegocio = negocios.find((n) => n.id === activeId);

  function getEtapaId(id: string): string | null {
    if (etapas.find((e) => e.id === id)) return id;
    const negocio = negocios.find((n) => n.id === id);
    return negocio?.pipeline_etapa_id ?? null;
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
  }

  function handleDragOver(e: DragOverEvent) {
    setOverId((e.over?.id as string) ?? null);
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    setOverId(null);
    const { active, over } = e;
    if (!over) return;

    const negocioId = active.id as string;
    const etapaDestino = getEtapaId(over.id as string);
    const atual = negocios.find((n) => n.id === negocioId);
    if (!etapaDestino || etapaDestino === atual?.pipeline_etapa_id) return;

    await fetch(`/api/negocios/${negocioId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, pipeline_etapa_id: etapaDestino, origem_mudanca: "drag_kanban" }),
    });
    onNegocioAtualizado();
  }

  const getEtapaNegocios = useCallback((etapaId: string) => negocios.filter((n) => n.pipeline_etapa_id === etapaId), [negocios]);
  const getEtapaValor = useCallback((etapaId: string) =>
    negocios.filter((n) => n.pipeline_etapa_id === etapaId && n.valor).reduce((s, n) => s + Number(n.valor), 0), [negocios]);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 h-full overflow-x-auto pb-4" style={{ minHeight: 0 }}>
        {etapas.map((etapa) => {
          const etapaNegocios = getEtapaNegocios(etapa.id);
          const etapaValor = getEtapaValor(etapa.id);
          const isOver = overId ? getEtapaId(overId) === etapa.id : false;
          const cor = etapa.e_ganho ? "#10B981" : etapa.e_perdido ? "#f87171" : "var(--status-ganho)";
          const limite = limitesPorEtapa[etapa.id] ?? CARDS_POR_LOTE;
          const negociosVisiveis = etapaNegocios.slice(0, limite);
          const ocultos = etapaNegocios.length - negociosVisiveis.length;

          return (
            <div key={etapa.id} className="flex flex-col shrink-0 w-64 rounded-xl transition-all"
              style={{ background: "var(--surface)", border: isOver ? `1px solid ${cor}60` : "1px solid var(--border-subtle)" }}>
              <div className="px-4 py-3 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cor }} />
                  <span className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{etapa.nome}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {etapaValor > 0 && (
                    <span className="text-[10px] font-bold" style={{ color: "var(--status-ganho)" }}>
                      R$ {(etapaValor / 1000).toFixed(1)}k
                    </span>
                  )}
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: "var(--input-border)", color: "var(--text-secondary)" }}>
                    {etapaNegocios.length}
                  </span>
                </div>
              </div>

              <SortableContext id={etapa.id} items={negociosVisiveis.map((n) => n.id)} strategy={verticalListSortingStrategy}>
                <DroppableColuna etapa={etapa} isOver={isOver}>
                  {etapaNegocios.length === 0 && !isOver && (
                    <div className="flex items-center justify-center h-16 rounded-xl" style={{ border: "1px dashed var(--border-subtle)" }}>
                      <p className="text-xs" style={{ color: "var(--text-faint)" }}>Solte aqui</p>
                    </div>
                  )}
                  {negociosVisiveis.map((negocio) => (
                    <NegocioCard key={negocio.id} negocio={negocio} selecionado={selecionados.includes(negocio.id)} equipe={equipe}
                      onToggleSelecionado={onToggleSelecionado} onClick={onAbrirNegocio} />
                  ))}
                  {ocultos > 0 && (
                    <button
                      onClick={() => setLimitesPorEtapa((prev) => ({ ...prev, [etapa.id]: limite + CARDS_POR_LOTE }))}
                      className="w-full py-2 rounded-lg text-xs font-semibold"
                      style={{ background: "var(--input-bg)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
                    >
                      Carregar mais {Math.min(ocultos, CARDS_POR_LOTE)} (de {ocultos} ocultos)
                    </button>
                  )}
                </DroppableColuna>
              </SortableContext>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeNegocio && (
          <div className="rounded-xl p-3 w-64 rotate-2" style={{ background: "var(--surface-alt)", border: "1px solid var(--primary-border)", boxShadow: "0 16px 48px rgba(0,0,0,0.25)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{activeNegocio.titulo}</p>
            {activeNegocio.leads?.nome && <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{activeNegocio.leads.nome}</p>}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
