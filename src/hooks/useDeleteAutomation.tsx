import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useDeleteAutomation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (automationId: string) => {
      const { error } = await supabase
        .from("automations")
        .delete()
        .eq("id", automationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast({
        title: "Automação deletada",
        description: "A automação foi removida com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao deletar automação",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
