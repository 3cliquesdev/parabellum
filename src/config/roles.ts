// ========== FONTE ÚNICA DA VERDADE PARA ROLES ==========
// Centraliza todas as definições de roles com acesso total
// e home pages por role para evitar duplicação no código
//
// CONTRATO DE PARIDADE:
// Todos os roles em FULL_ACCESS_ROLES devem ter acesso idêntico
// a todas as funcionalidades do sistema.
//
// REGRA: Nunca usar `isAdmin` sozinho para restringir acesso.
// Sempre usar `hasFullAccess(role)` que inclui todos os gerentes.
//
// Única exceção: alteração de permissões do role "admin"
// (auto-proteção em RolePermissionsManager).

export const FULL_ACCESS_ROLES = [
  "admin",
  "manager",
  "general_manager",
  "support_manager",
  "cs_manager",
  "financial_manager",
] as const;

export type FullAccessRole = typeof FULL_ACCESS_ROLES[number];

/**
 * Verifica se um role tem acesso total ao sistema
 * Roles com acesso total podem ver todas as páginas e menus
 */
export const hasFullAccess = (role: string | null | undefined): boolean => {
  if (!role) return false;
  return FULL_ACCESS_ROLES.includes(role as FullAccessRole);
};

/**
 * Mapeamento de home pages por role
 * Usado para redirecionar usuários para suas páginas iniciais adequadas
 */
/**
 * Labels amigáveis para exibição de roles na UI
 */
export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  general_manager: "Gerente Geral",
  manager: "Gerente",
  sales_rep: "Vendedor",
  consultant: "Consultor",
  support_agent: "Agente de Suporte",
  support_manager: "Gerente de Suporte",
  financial_manager: "Gerente Financeiro",
  financial_agent: "Agente Financeiro",
  cs_manager: "Gerente CS",
  ecommerce_analyst: "Analista E-commerce",
  user: "Cliente",
};

export const ROLE_HOME_PAGES: Record<string, string> = {
  support_manager: "/support",
  support_agent: "/support",
  financial_manager: "/support",
  financial_agent: "/support",
  cs_manager: "/cs-management",
  consultant: "/my-portfolio",
  sales_rep: "/",
  general_manager: "/analytics",
  admin: "/",
  manager: "/",
  user: "/client-portal",
  ecommerce_analyst: "/analytics",
};
