import { TourStep } from "../TourProvider";

export const PORTFOLIO_TOUR_ID = "portfolio-v1";

export const PORTFOLIO_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="portfolio-kpis"]',
    title: "📊 KPIs da Carteira",
    content: "Veja métricas importantes: total de clientes, receita sob gestão, clientes em risco e recém-chegados.",
  },
  {
    target: '[data-tour="portfolio-widgets"]',
    title: "📈 Widgets de Gestão",
    content: "Acompanhe: Radar de Expansão (oportunidades), Comissões e Alertas Antecipados de churn.",
  },
  {
    target: '[data-tour="portfolio-tabs"]',
    title: "🏷️ Filtros de Clientes",
    content: "Filtre por: Todos, Novos (recém-atribuídos), Em Onboarding ou Ativos.",
  },
  {
    target: '[data-tour="portfolio-client-card"]',
    title: "👤 Card do Cliente",
    content: "Veja detalhes: plano, progresso do onboarding, último contato e saúde. Ações rápidas para WhatsApp e Email.",
  },
  {
    target: '[data-tour="portfolio-qbr"]',
    title: "📋 Gerar QBR",
    content: "Gere Quarterly Business Review automaticamente com métricas e sugestões para reunião com o cliente.",
  },
];
