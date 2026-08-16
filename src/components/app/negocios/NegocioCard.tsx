"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Negocio } from "@/types/database";
import { ORIGEM_LEAD_LABEL } from "@/lib/leads/origem";

interface NegocioCardProps {
  negocio: Negocio;
  selecionado: boolean;
  onToggleSelecionado: (id: string) => void;
  onClick: (negocio: Negocio) => void;
}

export function NegocioCard({ negocio, selecionado, onToggleSelecionado, onClick }: NegocioCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: negocio.id,
  });

  const origem = negocio.origem ? ORIGEM_LEAD_LABEL[negocio.origem] : null;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => !isDragging && onClick(negocio)}
      className="rounded-xl p-3 select-none"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        cursor: isDragging ? "grabbing" : "grab",
        background: selecionado ? "var(--active-soft-bg)" : "var(--surface)",
        border: selecionado ? "1px solid var(--active-soft-border)" : "1px solid var(--border-subtle)",
        boxShadow: isDragging ? "0 8px 32px rgba(0,0,0,0.35)" : "none",
      }}>

      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={selecionado}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggleSelecionado(negocio.id)}
          className="mt-0.5 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{negocio.titulo}</p>
          {negocio.leads?.nome && (
            <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>{negocio.leads.nome}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-2.5 pl-6">
        {origem ? (
          <span className="text-[10px] font-semibold truncate" style={{ color: origem.color }}>{origem.label}</span>
        ) : <span />}
        {negocio.valor ? (
          <span className="text-xs font-bold shrink-0" style={{ color: "var(--status-ganho)" }}>
            R$ {Number(negocio.valor).toLocaleString("pt-BR")}
          </span>
        ) : (
          <span className="text-xs shrink-0" style={{ color: "var(--text-faint)" }}>Sem valor</span>
        )}
      </div>
    </div>
  );
}
