"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Negocio } from "@/types/database";
import { ORIGEM_LEAD_LABEL } from "@/lib/leads/origem";

interface MembroEquipe {
  user_id: string | null;
  email: string | null;
}

interface NegocioCardProps {
  negocio: Negocio;
  selecionado: boolean;
  equipe: MembroEquipe[];
  onToggleSelecionado: (id: string) => void;
  onClick: (negocio: Negocio) => void;
}

// "Parado" (mesma regra do Parabellum de referencia): sem atualizacao ha
// mais de 14 dias, e so faz sentido pra negocio ainda aberto - ganho/
// perdido nao precisa de aviso de SLA.
const DIAS_PARADO_LIMITE = 14;

function diasParado(negocio: Negocio): number | null {
  if (negocio.estagio !== "aberto") return null;
  const dias = Math.floor((Date.now() - new Date(negocio.updated_at).getTime()) / (1000 * 60 * 60 * 24));
  return dias >= DIAS_PARADO_LIMITE ? dias : null;
}

export function NegocioCard({ negocio, selecionado, equipe, onToggleSelecionado, onClick }: NegocioCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: negocio.id,
  });

  const origem = negocio.origem ? ORIGEM_LEAD_LABEL[negocio.origem] : null;
  const parado = diasParado(negocio);
  const vendedor = equipe.find((m) => m.user_id === negocio.assigned_to);

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
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{negocio.titulo}</p>
            {parado !== null && (
              <span title={`Sem atualização há ${parado} dias`} className="w-2 h-2 rounded-full shrink-0" style={{ background: "#dc2626" }} />
            )}
          </div>
          {negocio.leads?.nome && (
            <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>{negocio.leads.nome}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-2.5 pl-6">
        <div className="flex items-center gap-1.5 min-w-0">
          {origem && <span className="text-[10px] font-semibold truncate" style={{ color: origem.color }}>{origem.label}</span>}
          {vendedor?.email && (
            <span title={vendedor.email} className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
              style={{ background: "var(--accent)", color: "var(--status-ganho)" }}>
              {vendedor.email.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
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
