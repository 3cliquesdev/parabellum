import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface InternalUser {
  id: string;
  full_name: string;
  job_title: string | null;
  avatar_url: string | null;
  department: string | null;
  role: string;
}

export function useInternalUsers() {
  return useQuery({
    queryKey: ["internal-users"],
    queryFn: async () => {
      console.log("[useInternalUsers] Fetching internal users...");
      
      // Buscar apenas usuários com roles de funcionários internos (excluir role="user" que são clientes)
      const employeeRoles = [
        'admin',
        'general_manager',
        'manager',
        'sales_rep',
        'consultant',
        'support_agent',
        'support_manager',
        'financial_manager',
        'cs_manager'
      ] as const;
      
      // Primeiro buscar user_ids com roles de funcionários
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", employeeRoles);

      if (rolesError) {
        console.error("[useInternalUsers] Error fetching user roles:", rolesError);
        throw rolesError;
      }
      
      // Criar mapa de user_id -> role (pegar primeira role)
      const userRoleMap = new Map<string, string>();
      userRoles?.forEach(r => {
        if (!userRoleMap.has(r.user_id)) {
          userRoleMap.set(r.user_id, r.role);
        }
      });
      
      const userIds = Array.from(userRoleMap.keys());
      
      if (userIds.length === 0) {
        return [];
      }
      
      // Buscar profiles correspondentes
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, job_title, avatar_url, department")
        .in("id", userIds)
        .order("full_name");

      if (error) {
        console.error("[useInternalUsers] Error fetching profiles:", error);
        throw error;
      }
      
      // Adicionar role de volta
      const users = data?.map(profile => ({
        ...profile,
        role: userRoleMap.get(profile.id) || 'user',
      })) || [];
      
      console.log("[useInternalUsers] Internal users fetched:", users);
      return users as InternalUser[];
    },
  });
}
