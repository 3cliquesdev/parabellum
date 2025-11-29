import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ImportDocumentParams {
  text: string;
  fileName: string;
  category: string;
  tags: string[];
  mode: 'full_document' | 'split_sections';
}

interface ImportResult {
  created: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

export function useImportDocument() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ImportDocumentParams): Promise<ImportResult> => {
      const { data, error } = await supabase.functions.invoke('process-knowledge-import', {
        body: {
          ...params,
          source: 'document_import',
        },
      });

      if (error) throw error;
      return data as ImportResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-articles"] });
      
      toast({
        title: "Documento importado",
        description: `${result.created} artigo(s) criado(s)${
          result.errors.length > 0 ? `, ${result.errors.length} erro(s)` : ''
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
