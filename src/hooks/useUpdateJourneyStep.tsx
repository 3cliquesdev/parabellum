import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UpdateJourneyStepData {
  id: string;
  contact_id: string;
  step_name?: string;
  is_critical?: boolean;
  completed?: boolean;
  position?: number;
  notes?: string;
}

export function useUpdateJourneyStep() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, contact_id, ...data }: UpdateJourneyStepData) => {
      const { data: result, error } = await supabase
        .from("customer_journey_steps")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["journey-steps", variables.contact_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["customer-timeline", variables.contact_id] 
      });
      toast({
        title: "Etapa atualizada",
        description: "A etapa do onboarding foi atualizada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar etapa",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
