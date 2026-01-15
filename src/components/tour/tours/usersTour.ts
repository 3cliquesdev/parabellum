import { TourStep } from "../TourProvider";

export const USERS_TOUR_ID = "users-v1";

export const USERS_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="users-create-button"]',
    title: "➕ Novo Usuário",
    content: "Cadastre um novo usuário no sistema. Defina nome, email, cargo e perfil de acesso.",
  },
  {
    target: '[data-tour="users-table"]',
    title: "👥 Lista de Usuários",
    content: "Veja todos os usuários cadastrados. A tabela mostra nome, cargo, perfil, status e habilidades.",
  },
  {
    target: '[data-tour="users-status-tabs"]',
    title: "🏷️ Filtros de Status",
    content: "Filtre por status: Todos, Ativos, Bloqueados ou Arquivados.",
  },
  {
    target: '[data-tour="users-permissions-tab"]',
    title: "🛡️ Permissões",
    content: "Gerencie permissões por perfil. Configure o que cada cargo pode fazer no sistema.",
  },
  {
    target: '[data-tour="users-actions"]',
    title: "⚙️ Ações do Usuário",
    content: "Edite, bloqueie, arquive ou reenvie email de boas-vindas. Gerencie status de disponibilidade.",
  },
];
