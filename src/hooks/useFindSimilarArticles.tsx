import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SimilarArticle {
  id: string;
  title: string;
  category: string | null;
  similarity: number;
}

export function useFindSimilarArticles(
  articleId: string | null,
  similarityThreshold: number = 0.90
) {
  return useQuery({
    queryKey: ["similar-articles", articleId, similarityThreshold],
    queryFn: async () => {
      if (!articleId) return [];

      const { data, error } = await supabase.rpc("find_similar_articles", {
        article_id: articleId,
        similarity_threshold: similarityThreshold,
        max_results: 5,
      });

      if (error) throw error;
      return (data || []) as SimilarArticle[];
    },
    enabled: !!articleId,
  });
}
