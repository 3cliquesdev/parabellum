import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useStages(pipelineId?: string) {
  return useQuery({
    queryKey: ["stages", pipelineId],
    queryFn: async () => {
      let query = supabase
        .from("stages")
        .select("*")
        .order("position", { ascending: true });

      if (pipelineId) {
        query = query.eq("pipeline_id", pipelineId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
