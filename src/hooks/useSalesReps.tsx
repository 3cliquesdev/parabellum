import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSalesReps() {
  return useQuery({
    queryKey: ["sales-reps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id, 
          full_name, 
          job_title, 
          avatar_url,
          user_roles!inner(role)
        `)
        .eq("user_roles.role", "sales_rep")
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });
}
