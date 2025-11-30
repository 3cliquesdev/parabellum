import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useGenerateEmbedding() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ articleId, content }: { articleId: string; content: string }) => {
      // Generate embedding
      const { data, error } = await supabase.functions.invoke('generate-article-embedding', {
        body: { article_id: articleId, content },
      });

      if (error) throw error;

      // Check for duplicates after embedding is generated
      const { data: duplicateCheck, error: dupError } = await supabase.rpc(
        "check_duplicate_articles",
        {
          p_content: content,
          p_article_id: articleId,
          similarity_threshold: 0.90,
        }
      );

      if (!dupError && duplicateCheck && duplicateCheck.length > 0) {
        const result = duplicateCheck[0];
        if (result.similar_count > 0) {
          toast({
            title: "⚠️ Artigo Similar Detectado",
            description: `Encontrado artigo muito similar: "${result.top_similar_title}" (${Math.round(result.top_similarity * 100)}% de similaridade)`,
            variant: "default",
          });
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["similar-articles"] });
      toast({
        title: "✅ Embedding gerado",
        description: "Artigo indexado para busca semântica",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao gerar embedding",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
