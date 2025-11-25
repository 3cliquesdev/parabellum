import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ContactRow {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  birth_date?: string;
  assigned_to?: string;
}

interface ImportResult {
  created: number;
  updated: number;
  errors: Array<{ row: number; email: string; error: string }>;
}

export function useImportContacts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contacts: ContactRow[]): Promise<ImportResult> => {
      const { data, error } = await supabase.functions.invoke('bulk-import-contacts', {
        body: { contacts },
      });

      if (error) throw error;
      return data as ImportResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      
      toast({
        title: "Importação concluída",
        description: `${result.created} criados, ${result.updated} atualizados${
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
