import { TourStep } from "../TourProvider";

export const SETTINGS_TOUR_ID = "settings-v1";

export const SETTINGS_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="settings-ai"]',
    title: "🧠 Inteligência Artificial",
    content: "Configure o modelo de IA, treinamento e importe base de conhecimento para o chatbot.",
  },
  {
    target: '[data-tour="settings-channels"]',
    title: "📱 Canais de Comunicação",
    content: "Configure WhatsApp, Instagram, Widget de Chat e Links Diretos para atendimento.",
  },
  {
    target: '[data-tour="settings-ecommerce"]',
    title: "🛒 E-commerce & Vendas",
    content: "Integre Kiwify, gerencie produtos, configure scoring de leads e grupos de entrega.",
  },
  {
    target: '[data-tour="settings-support"]',
    title: "🎧 Atendimento",
    content: "Configure status de tickets, SLA, macros de resposta rápida e departamentos.",
  },
  {
    target: '[data-tour="settings-integrations"]',
    title: "🔌 Integrações",
    content: "Central de integrações, webhooks e configurações de banco de dados.",
  },
];
