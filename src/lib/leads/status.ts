import type { LeadStatus } from "@/types/database";

export const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo", em_contato: "Em Contato", qualificado: "Qualificado",
  proposta: "Proposta", negociacao: "Negociação", ganho: "Ganho", perdido: "Perdido",
};

export const STATUS_COLOR: Record<LeadStatus, string> = {
  novo: "rgba(255,255,255,0.2)", em_contato: "#60a5fa", qualificado: "#a78bfa",
  proposta: "#fb923c", negociacao: "#facc15", ganho: "#10B981", perdido: "#f87171",
};
