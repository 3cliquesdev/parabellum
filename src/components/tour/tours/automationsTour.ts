import { TourStep } from "../TourProvider";

export const AUTOMATIONS_TOUR_ID = "automations-v1";

export const AUTOMATIONS_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="automations-list"]',
    title: "⚙️ Suas Automações",
    content: "Veja todas as automações configuradas. Cada card mostra o nome, gatilho, ação e se está ativa. Automações inativas não executam.",
  },
  {
    target: '[data-tour="automations-create-button"]',
    title: "➕ Nova Automação",
    content: "Crie uma nova automação definindo: QUANDO (gatilho) e O QUE FAZER (ação). Por exemplo: quando ticket criado → notificar responsável.",
  },
  {
    target: '[data-tour="automations-toggle"]',
    title: "🔘 Ativar/Desativar",
    content: "Use o toggle para ativar ou desativar rapidamente uma automação. Útil para pausar temporariamente sem excluir.",
  },
  {
    target: '[data-tour="automations-logs"]',
    title: "📜 Logs de Execução",
    content: "Veja o histórico de execuções de cada automação. Identifique erros e acompanhe quantas vezes cada automação foi disparada.",
  },
];
