import { TourStep } from "../TourProvider";

export const PROJECTS_TOUR_ID = "projects-v1";

export const PROJECTS_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="projects-create-button"]',
    title: "➕ Novo Projeto",
    content: "Crie um novo projeto/board para organizar tarefas. Defina nome, cor e vincule a um cliente.",
  },
  {
    target: '[data-tour="projects-search"]',
    title: "🔍 Buscar Projetos",
    content: "Busque projetos pelo nome. A busca é instantânea conforme você digita.",
  },
  {
    target: '[data-tour="projects-tabs"]',
    title: "📊 Filtros de Status",
    content: "Filtre projetos por status: Todos, Ativos, Concluídos ou Arquivados.",
  },
  {
    target: '[data-tour="projects-view-toggle"]',
    title: "🔲 Modo de Visualização",
    content: "Alterne entre visualização em grade (cards) ou lista. Escolha o que preferir.",
  },
  {
    target: '[data-tour="projects-board-card"]',
    title: "📋 Card do Projeto",
    content: "Clique em um card para abrir o Kanban do projeto. Veja progresso, tarefas e prazo.",
  },
];
