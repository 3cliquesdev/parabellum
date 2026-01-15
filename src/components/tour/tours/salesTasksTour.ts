import { TourStep } from "../TourProvider";

export const SALES_TASKS_TOUR_ID = "sales-tasks-v1";

export const SALES_TASKS_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="sales-tasks-filters"]',
    title: "🏷️ Filtros por Tipo",
    content: "Filtre tarefas por tipo: Emails, WhatsApp, Ligações ou Tarefas manuais. Veja contadores de cada.",
  },
  {
    target: '[data-tour="sales-tasks-date"]',
    title: "📅 Selecionar Data",
    content: "Escolha a data para ver tarefas agendadas. Por padrão mostra as de hoje.",
  },
  {
    target: '[data-tour="sales-tasks-card"]',
    title: "📋 Card da Tarefa",
    content: "Veja detalhes: contato, empresa, cadência, passo atual e template sugerido.",
  },
  {
    target: '[data-tour="sales-tasks-execute"]',
    title: "✅ Executar Tarefa",
    content: "Clique para marcar como executada. A cadência avança automaticamente para o próximo passo.",
  },
  {
    target: '[data-tour="sales-tasks-skip"]',
    title: "⏭️ Pular Tarefa",
    content: "Pule a tarefa se não for possível executar. O contato permanece na cadência.",
  },
];
