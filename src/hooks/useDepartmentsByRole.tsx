import { useMemo } from "react";
import { useDepartments } from "./useDepartments";

/**
 * Hook para retornar IDs de departamentos permitidos baseado no role do usuário
 * Usado para filtrar conversas/tickets por departamento de forma consistente
 */
export function useDepartmentsByRole(role: string | null) {
  const { data: departments, isLoading } = useDepartments({ activeOnly: true });

  const departmentIds = useMemo(() => {
    if (!departments || !role) return null;

    switch (role) {
      case "sales_rep":
        // Vendedor: departamentos comerciais
        return departments
          .filter((d) =>
            ["Comercial", "Vendas", "Sales"].some(
              (name) => d.name.toLowerCase() === name.toLowerCase()
            )
          )
          .map((d) => d.id);

      case "support_agent":
        // Suporte: departamento de suporte
        return departments
          .filter((d) =>
            ["Suporte", "Support", "Atendimento"].some(
              (name) => d.name.toLowerCase() === name.toLowerCase()
            )
          )
          .map((d) => d.id);

      case "financial_agent":
      case "financial_manager":
        // Financeiro: departamento financeiro
        return departments
          .filter((d) =>
            ["Financeiro", "Finance", "Financial"].some(
              (name) => d.name.toLowerCase() === name.toLowerCase()
            )
          )
          .map((d) => d.id);

      case "consultant":
      case "cs_manager":
        // CS: departamento de customer success
        return departments
          .filter((d) =>
            ["CS", "Customer Success", "Sucesso do Cliente"].some(
              (name) => d.name.toLowerCase() === name.toLowerCase()
            )
          )
          .map((d) => d.id);

      // Roles com acesso total (sem restrição de departamento)
      case "admin":
      case "manager":
      case "general_manager":
      case "support_manager":
        return null;

      default:
        // Role genérico 'user' ou desconhecido: sem acesso especial
        return [];
    }
  }, [departments, role]);

  return {
    departmentIds,
    isLoading,
    // Helper para verificar se um departamento está na lista permitida
    isDepartmentAllowed: (deptId: string | null) => {
      if (departmentIds === null) return true; // Acesso total
      if (!deptId) return true; // Conversas sem departamento são visíveis
      return departmentIds.includes(deptId);
    },
  };
}

// Roles que têm acesso total ao inbox (sem filtro de departamento)
export const FULL_ACCESS_ROLES = [
  "admin",
  "manager",
  "general_manager",
  "support_manager",
  "cs_manager",
];

// Helper para verificar se um role tem acesso total
export function hasFullInboxAccess(role: string | null): boolean {
  if (!role) return false;
  return FULL_ACCESS_ROLES.includes(role);
}
