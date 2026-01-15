import { TourStep } from "../TourProvider";

export const DASHBOARD_TOUR_ID = "dashboard-v1";

export const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="dashboard-kpis"]',
    title: "📊 Indicadores Principais",
    content: "Acompanhe os KPIs mais importantes: tickets abertos, SLA, tempo médio de resposta, conversas ativas e mais. Os números atualizam em tempo real.",
  },
  {
    target: '[data-tour="dashboard-charts"]',
    title: "📈 Gráficos",
    content: "Visualize tendências com gráficos de linha, barra e pizza. Compare períodos, veja evolução e identifique padrões.",
  },
  {
    target: '[data-tour="dashboard-period"]',
    title: "📅 Período",
    content: "Selecione o período de análise: hoje, últimos 7 dias, mês atual ou personalizado. Os dados são filtrados automaticamente.",
  },
  {
    target: '[data-tour="dashboard-quick-actions"]',
    title: "⚡ Ações Rápidas",
    content: "Acesse rapidamente: criar ticket, nova conversa, adicionar contato. Atalhos para as ações mais usadas.",
  },
];
