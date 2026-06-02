"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Lead } from "@/types/database";

interface LeadCardProps {
  lead: Lead;
  onClick: (lead: Lead) => void;
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => !isDragging && onClick(lead)}
      className="rounded-xl p-4 select-none lead-card"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        cursor: isDragging ? "grabbing" : "grab",
        background: "var(--surface-gradient)",
        border: "1px solid var(--border-subtle)",
        boxShadow: isDragging ? "0 8px 32px rgba(0,0,0,0.5)" : "none",
      }}>

      <p className="text-sm font-semibold text-white mb-1 truncate">{lead.nome}</p>

      {lead.servico_interesse && (
        <p className="text-xs mb-3 truncate" style={{ color: "var(--text-secondary)" }}>{lead.servico_interesse}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{ background: "var(--accent)", color: "var(--status-ganho)" }}>
          {lead.nome.charAt(0).toUpperCase()}
        </div>
        {lead.valor_estimado ? (
          <span className="text-xs font-bold" style={{ color: "var(--status-ganho)" }}>
            R$ {Number(lead.valor_estimado).toLocaleString("pt-BR")}
          </span>
        ) : (
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>Sem valor</span>
        )}
      </div>
    </div>
  );
}
