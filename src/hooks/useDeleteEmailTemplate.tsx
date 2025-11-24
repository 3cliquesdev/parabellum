import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({
        title: "Template deletado",
        description: "O template foi removido com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao deletar template",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
