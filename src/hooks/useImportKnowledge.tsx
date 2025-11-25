import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface KnowledgeRow {
  input: string;
  output: string;
  category?: string;
  tags?: string;
}

interface ImportKnowledgeParams {
  rows: KnowledgeRow[];
  mode: 'raw_history' | 'ready_faq';
  source: string;
}

interface ImportResult {
  created: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

export function useImportKnowledge() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ImportKnowledgeParams): Promise<ImportResult> => {
      const { data, error } = await supabase.functions.invoke('process-knowledge-import', {
        body: params,
      });

      if (error) throw error;
      return data as ImportResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-articles"] });
      
      toast({
        title: "Importação concluída",
        description: `${result.created} artigos criados, ${result.skipped} pulados${
          result.errors.length > 0 ? `, ${result.errors.length} erros` : ''
        }`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
