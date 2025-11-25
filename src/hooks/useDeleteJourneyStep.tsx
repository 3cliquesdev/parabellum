import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DeleteJourneyStepData {
  id: string;
  contact_id: string;
}

export function useDeleteJourneyStep() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id }: DeleteJourneyStepData) => {
      const { error } = await supabase
        .from("customer_journey_steps")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["journey-steps", variables.contact_id] 
      });
      toast({
        title: "Etapa deletada",
        description: "A etapa do onboarding foi removida com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao deletar etapa",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
