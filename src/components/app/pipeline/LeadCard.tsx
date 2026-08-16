"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Lead } from "@/types/database";
import { ORIGEM_LEAD_LABEL } from "@/lib/leads/origem";

interface LeadCardProps {
  lead: Lead;
  onClick: (lead: Lead) => void;
}

const SITUACAO_PAGAMENTO_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  carrinho_abandonado: { label: "Carrinho abandonado", color: "#b45309", bg: "rgba(180,83,9,0.12)" },
  cartao_recusado: { label: "Pagamento recusado", color: "#b91c1c", bg: "rgba(185,28,28,0.12)" },
  aguardando_pagamento: { label: "Aguardando pagamento", color: "#a16207", bg: "rgba(161,98,7,0.12)" },
};

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

      {lead.situacao_pagamento && SITUACAO_PAGAMENTO_LABEL[lead.situacao_pagamento] && (
        <span
          className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2"
          style={{
            color: SITUACAO_PAGAMENTO_LABEL[lead.situacao_pagamento].color,
            background: SITUACAO_PAGAMENTO_LABEL[lead.situacao_pagamento].bg,
          }}
        >
          {SITUACAO_PAGAMENTO_LABEL[lead.situacao_pagamento].label}
        </span>
      )}

      {lead.servico_interesse && (
        <p className="text-xs mb-3 truncate" style={{ color: "var(--text-secondary)" }}>{lead.servico_interesse}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
            style={{ background: "var(--accent)", color: "var(--status-ganho)" }}>
            {lead.nome.charAt(0).toUpperCase()}
          </div>
          {lead.origem_lead && ORIGEM_LEAD_LABEL[lead.origem_lead] && (
            <span className="text-[10px] font-semibold truncate" style={{ color: ORIGEM_LEAD_LABEL[lead.origem_lead].color }}>
              {ORIGEM_LEAD_LABEL[lead.origem_lead].label}
            </span>
          )}
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
