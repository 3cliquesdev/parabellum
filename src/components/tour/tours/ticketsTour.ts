import { TourStep } from "../TourProvider";

export const TICKETS_TOUR_ID = "tickets-v1";

export const TICKETS_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="tickets-sidebar"]',
    title: "📋 Filtros Rápidos",
    content: "Use esta barra lateral para filtrar tickets por status: Meus Abertos, Sem Responsável, SLA Expirado, etc. Clique em um filtro para ver apenas esses tickets.",
  },
  {
    target: '[data-tour="tickets-create-button"]',
    title: "➕ Criar Novo Ticket",
    content: "Clique aqui para criar um novo ticket. Você precisará buscar um cliente, adicionar uma evidência (print/foto obrigatório) e preencher os detalhes do problema.",
  },
  {
    target: '[data-tour="tickets-filter-popover"]',
    title: "🔍 Filtros Avançados",
    content: "Use os filtros avançados para buscas mais específicas: por departamento, responsável, prioridade, tags, data de criação e muito mais.",
  },
  {
    target: '[data-tour="tickets-table"]',
    title: "📊 Lista de Tickets",
    content: "Aqui você vê todos os tickets. Clique em um para abrir os detalhes. Use Tab/Shift+Tab para navegar e Enter para abrir. Arraste para reordenar por prioridade.",
  },
  {
    target: '[data-tour="tickets-bulk-actions"]',
    title: "✅ Ações em Massa",
    content: "Marque múltiplos tickets usando as caixas de seleção para aplicar ações em lote: arquivar, transferir departamento, atribuir responsável ou mover para projeto.",
  },
];
