import { TourStep } from "../TourProvider";

export const DEALS_TOUR_ID = "deals-v1";

export const DEALS_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="deals-pipeline"]',
    title: "📊 Pipeline de Vendas",
    content: "Visualize seus negócios organizados por etapas do funil. Cada coluna representa uma fase da venda, do primeiro contato até o fechamento.",
  },
  {
    target: '[data-tour="deals-create-button"]',
    title: "➕ Criar Negócio",
    content: "Clique aqui para adicionar um novo negócio ao pipeline. Vincule a um contato, defina valor, produto e etapa inicial.",
  },
  {
    target: '[data-tour="deals-card"]',
    title: "🎴 Cards de Negócio",
    content: "Cada card mostra: nome do cliente, valor do negócio, produto e tempo na etapa. Clique para ver detalhes completos.",
  },
  {
    target: '[data-tour="deals-drag"]',
    title: "↔️ Arrastar e Soltar",
    content: "Arraste os cards entre as colunas para mover negócios entre etapas. O sistema registra automaticamente cada movimentação.",
  },
  {
    target: '[data-tour="deals-filters"]',
    title: "🔍 Filtros",
    content: "Filtre negócios por responsável, produto, período ou valor. Use para focar em oportunidades específicas.",
  },
];
