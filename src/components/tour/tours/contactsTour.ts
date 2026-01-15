import { TourStep } from "../TourProvider";

export const CONTACTS_TOUR_ID = "contacts-v1";

export const CONTACTS_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="contacts-list"]',
    title: "📇 Lista de Contatos",
    content: "Visualize todos os seus contatos/clientes. A tabela mostra nome, email, telefone, empresa e status. Clique em um contato para ver detalhes.",
  },
  {
    target: '[data-tour="contacts-search"]',
    title: "🔍 Busca Rápida",
    content: "Busque contatos por nome, email, telefone ou empresa. A busca é instantânea e mostra resultados enquanto você digita.",
  },
  {
    target: '[data-tour="contacts-create-button"]',
    title: "➕ Novo Contato",
    content: "Cadastre um novo contato manualmente. Preencha os dados básicos e informações adicionais como endereço e documentos.",
  },
  {
    target: '[data-tour="contacts-import"]',
    title: "📥 Importar Contatos",
    content: "Importe múltiplos contatos de uma vez usando planilha Excel/CSV. O sistema mapeia automaticamente as colunas.",
  },
  {
    target: '[data-tour="contacts-filters"]',
    title: "🏷️ Filtros e Tags",
    content: "Filtre por status, tags, consultor responsável e mais. Use tags para organizar e segmentar sua base de clientes.",
  },
];
