"use client";

import { useState, useCallback } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDroppable, type DragStartEvent, type DragEndEvent, type DragOverEvent,
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

function DroppableColumn({ col, children, isOver }: { col: typeof COLUMNS[0]; children: React.ReactNode; isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id: col.id });
  return (
    <div ref={setNodeRef} className="flex-1 overflow-y-auto p-3 space-y-2 transition-colors"
      style={{
        minHeight: "120px",
        background: isOver ? `${col.color}08` : "transparent",
        borderRadius: "0 0 16px 16px",
      }}>
      {children}
    </div>
  );
}

interface KanbanBoardProps {
  leads: Lead[];
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onLeadUpdated: () => void;
  tenantId: string;
}

export function KanbanBoard({ leads, onStatusChange, onLeadUpdated, tenantId }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const activeLead = leads.find((l) => l.id === activeId);

  function getColumnId(id: string): LeadStatus | null {
    if (COLUMNS.find(c => c.id === id)) return id as LeadStatus;
    const lead = leads.find(l => l.id === id);
    return lead?.status ?? null;
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
  }

  function handleDragOver(e: DragOverEvent) {
    setOverId(e.over?.id as string ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    setOverId(null);
    const { active, over } = e;
    if (!over) return;

    const leadId = active.id as string;
    const targetColId = getColumnId(over.id as string);
    const currentLead = leads.find(l => l.id === leadId);

    if (targetColId && targetColId !== currentLead?.status) {
      onStatusChange(leadId, targetColId);
    }
  }

  const getColumnLeads = useCallback((status: LeadStatus) => leads.filter(l => l.status === status), [leads]);
  const getColumnValue = useCallback((status: LeadStatus) =>
    leads.filter(l => l.status === status && l.valor_estimado).reduce((s, l) => s + Number(l.valor_estimado), 0), [leads]);

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 h-full overflow-x-auto pb-4" style={{ minHeight: 0 }}>
          {COLUMNS.map((col) => {
            const colLeads = getColumnLeads(col.id);
            const colValue = getColumnValue(col.id);
            const isOver = overId ? getColumnId(overId) === col.id : false;

            return (
              <div key={col.id} className="flex flex-col shrink-0 w-64 rounded-2xl transition-all"
                style={{
                  background: isOver ? "var(--input-bg)" : "var(--surface)",
                  border: isOver ? `1px solid ${col.color}30` : "1px solid var(--border-subtle)",
                }}>

                {/* Header */}
                <div className="px-4 py-3 flex items-center justify-between shrink-0"
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                    <span className="text-xs font-bold text-white">{col.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {colValue > 0 && (
                      <span className="text-[10px] font-bold" style={{ color: "var(--status-ganho)" }}>
                        R$ {(colValue / 1000).toFixed(0)}k
                      </span>
                    )}
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background: "var(--input-border)", color: "var(--text-secondary)" }}>
                      {colLeads.length}
                    </span>
                  </div>
                </div>

                {/* Drop zone */}
                <SortableContext id={col.id} items={colLeads.map(l => l.id)} strategy={verticalListSortingStrategy}>
                  <DroppableColumn col={col} isOver={isOver}>
                    {colLeads.length === 0 && !isOver && (
                      <div className="flex items-center justify-center h-16 rounded-xl"
                        style={{ border: "1px dashed var(--border-subtle)" }}>
                        <p className="text-xs" style={{ color: "var(--text-faint)" }}>Solte aqui</p>
                      </div>
                    )}
                    {colLeads.map(lead => (
                      <LeadCard key={lead.id} lead={lead} onClick={setSelectedLead} />
                    ))}
                  </DroppableColumn>
                </SortableContext>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeLead && (
            <div className="rounded-xl p-4 w-64 rotate-2"
              style={{
                background: "var(--surface-alt)",
                border: "1px solid var(--primary-border)",
                boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
              }}>
              <p className="text-sm font-semibold text-white">{activeLead.nome}</p>
              {activeLead.servico_interesse && (
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{activeLead.servico_interesse}</p>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {selectedLead && (
        <LeadSheet lead={selectedLead} onClose={() => setSelectedLead(null)}
          onUpdated={() => { onLeadUpdated(); setSelectedLead(null); }} tenantId={tenantId} />
      )}
    </>
  );
}
