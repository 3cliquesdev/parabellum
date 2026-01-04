import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Filtra apenas vendedores (sales_rep) - consultores têm seu próprio hook
export function useSalesReps() {
  return useQuery({
    queryKey: ["sales-reps"],
    queryFn: async () => {
      console.log("[useSalesReps] Fetching sales reps...");
      
      // Filtrar apenas vendedores (sales_rep)
      const salesRoles = ['sales_rep'] as const;
      
      // Primeiro buscar user_ids com roles de funcionários
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", salesRoles);

      if (rolesError) {
        console.error("[useSalesReps] Error fetching user roles:", rolesError);
        throw rolesError;
      }
      
      // Extrair user_ids únicos
      const userIds = [...new Set(userRoles?.map(r => r.user_id) || [])];
      
      if (userIds.length === 0) {
        return [];
      }
      
      // Buscar profiles correspondentes
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, job_title, avatar_url, availability_status")
        .in("id", userIds)
        .order("full_name");

      if (error) {
        console.error("[useSalesReps] Error fetching profiles:", error);
        throw error;
      }
      
      console.log("[useSalesReps] Employees fetched:", data);
      return data || [];
    },
  });
}
