import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook para buscar categorias distintas da base de conhecimento
 * Usado no PersonaDialog para multi-select de categorias permitidas
 */
export function useKnowledgeCategories() {
  return useQuery({
    queryKey: ["knowledge-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_distinct_knowledge_categories");

      if (error) {
        console.error("Error fetching knowledge categories:", error);
        throw error;
      }

      return (data ?? []).map((row: { category: string }) => row.category);
    },
  });
}
