import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OperationalUser {
  id: string;
  full_name: string;
  role: "sales_rep" | "consultant" | "support_agent";
  avatar_url: string | null;
  job_title: string | null;
}

/**
 * Hook para buscar APENAS usuários operacionais (equipe de execução).
 * EXCLUI: admin, manager, general_manager, cs_manager, support_manager, financial_manager
 * INCLUI: sales_rep, consultant, support_agent
 */
export function useOperationalUsers() {
  return useQuery({
    queryKey: ["operational-users"],
    queryFn: async () => {
      console.log("🔍 useOperationalUsers: Fetching operational staff...");
      
      // Buscar user_ids de usuários operacionais
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["sales_rep", "consultant", "support_agent"]);

      if (rolesError) {
        console.error("❌ Error fetching operational roles:", rolesError);
        throw rolesError;
      }

      console.log("✅ Found operational user roles:", userRoles?.length);

      if (!userRoles || userRoles.length === 0) {
        return [];
      }

      const operationalIds = userRoles.map(ur => ur.user_id);

      // Buscar perfis dos usuários operacionais
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, job_title")
        .in("id", operationalIds);

      if (profilesError) {
        console.error("❌ Error fetching operational profiles:", profilesError);
        throw profilesError;
      }

      // Mapear perfis com roles
      const usersWithRoles: OperationalUser[] = profiles.map(profile => {
        const userRole = userRoles.find(ur => ur.user_id === profile.id);
        return {
          id: profile.id,
          full_name: profile.full_name || "Sem nome",
          role: userRole?.role as "sales_rep" | "consultant" | "support_agent",
          avatar_url: profile.avatar_url,
          job_title: profile.job_title,
        };
      });

      console.log("✅ Operational users mapped:", usersWithRoles.length);
      return usersWithRoles;
    },
    staleTime: 2 * 60 * 1000, // Cache por 2 minutos
  });
}
