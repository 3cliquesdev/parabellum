"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Lead, LeadStatus } from "@/types/database";
import { LeadCard } from "./LeadCard";
import { LeadSheet } from "./LeadSheet";

const COLUMNS: { id: LeadStatus; label: string; color: string }[] = [
  { id: "novo", label: "Novo", color: "rgba(255,255,255,0.15)" },
  { id: "em_contato", label: "Em Contato", color: "#60a5fa" },
  { id: "qualificado", label: "Qualificado", color: "#a78bfa" },
  { id: "proposta", label: "Proposta", color: "#fb923c" },
  { id: "negociacao", label: "Negociação", color: "#facc15" },
  { id: "ganho", label: "Ganho", color: "#9aea62" },
  { id: "perdido", label: "Perdido", color: "#f87171" },
];

interface KanbanBoardProps {
  leads: Lead[];
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onLeadUpdated: () => void;
  tenantId: string;
}

export function KanbanBoard({ leads, onStatusChange, onLeadUpdated, tenantId }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activeLead = leads.find((l) => l.id === activeId);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const overId = over.id as string;

    // Se soltou sobre uma coluna
    const targetColumn = COLUMNS.find((c) => c.id === overId);
    if (targetColumn) {
      onStatusChange(leadId, targetColumn.id);
      return;
    }

    // Se soltou sobre outro lead — pega a coluna do lead destino
    const targetLead = leads.find((l) => l.id === overId);
    if (targetLead && targetLead.status !== leads.find((l) => l.id === leadId)?.status) {
      onStatusChange(leadId, targetLead.status);
    }
  }

  const getColumnLeads = useCallback(
    (status: LeadStatus) => leads.filter((l) => l.status === status),
    [leads]
  );

  const getColumnValue = useCallback(
    (status: LeadStatus) =>
      leads
        .filter((l) => l.status === status && l.valor_estimado)
        .reduce((sum, l) => sum + Number(l.valor_estimado), 0),
    [leads]
  );

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 h-full overflow-x-auto pb-4" style={{ minHeight: 0 }}>
          {COLUMNS.map((col) => {
            const colLeads = getColumnLeads(col.id);
            const colValue = getColumnValue(col.id);

            return (
              <div key={col.id} className="flex flex-col shrink-0 w-64 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>

                {/* Column header */}
                <div className="px-4 py-3 flex items-center justify-between shrink-0"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                    <span className="text-xs font-bold text-white">{col.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {colValue > 0 && (
                      <span className="text-[10px] font-bold" style={{ color: "#9aea62" }}>
                        R$ {(colValue / 1000).toFixed(0)}k
                      </span>
                    )}
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background: "rgba(255,255,255,0.08)", color: "#939da4" }}>
                      {colLeads.length}
                    </span>
                  </div>
                </div>

                {/* Drop zone */}
                <SortableContext
                  id={col.id}
                  items={colLeads.map((l) => l.id)}
                  strategy={verticalListSortingStrategy}>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2"
                    style={{ minHeight: "120px" }}
                    id={col.id}>
                    {colLeads.length === 0 && (
                      <div className="flex items-center justify-center h-16 rounded-xl"
                        style={{ border: "1px dashed rgba(255,255,255,0.06)" }}>
                        <p className="text-xs" style={{ color: "rgba(147,157,164,0.3)" }}>Vazio</p>
                      </div>
                    )}
                    {colLeads.map((lead) => (
                      <LeadCard key={lead.id} lead={lead} onClick={setSelectedLead} />
                    ))}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeLead && (
            <div className="rounded-xl p-4 w-64 rotate-2"
              style={{
                background: "linear-gradient(180deg, rgba(28,28,28,0.95) 0%, rgba(18,18,18,1) 100%)",
                border: "1px solid rgba(154,234,98,0.3)",
                boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
              }}>
              <p className="text-sm font-semibold text-white">{activeLead.nome}</p>
              {activeLead.servico_interesse && (
                <p className="text-xs mt-1" style={{ color: "#939da4" }}>{activeLead.servico_interesse}</p>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {selectedLead && (
        <LeadSheet
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdated={() => { onLeadUpdated(); setSelectedLead(null); }}
          tenantId={tenantId}
        />
      )}
    </>
  );
}
