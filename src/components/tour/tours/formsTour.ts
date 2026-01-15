import { TourStep } from "../TourProvider";

export const FORMS_TOUR_ID = "forms-v1";

export const FORMS_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="forms-list"]',
    title: "📋 Seus Formulários",
    content: "Veja todos os formulários criados. Cada card mostra o nome, número de campos e se está ativo. Formulários inativos não aceitam novas respostas.",
  },
  {
    target: '[data-tour="forms-create-button"]',
    title: "➕ Criar Formulário",
    content: "Crie um novo formulário personalizado. Adicione campos de texto, seleção, data, arquivo e muito mais. Defina campos obrigatórios e validações.",
  },
  {
    target: '[data-tour="forms-copy-link"]',
    title: "🔗 Copiar Link",
    content: "Copie o link público do formulário para compartilhar com clientes. Qualquer pessoa com o link pode preencher o formulário.",
  },
  {
    target: '[data-tour="forms-download"]',
    title: "📥 Baixar Respostas",
    content: "Exporte todas as respostas do formulário em CSV/Excel. O arquivo inclui dados do contato e todas as respostas organizadas.",
  },
  {
    target: '[data-tour="forms-toggle"]',
    title: "🔘 Ativar/Desativar",
    content: "Use o toggle para ativar ou desativar o formulário. Formulários desativados ainda exibem as respostas anteriores.",
  },
];
