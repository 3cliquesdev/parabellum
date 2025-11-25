import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateJourneyStepData {
  contact_id: string;
  step_name: string;
  is_critical?: boolean;
  position?: number;
  notes?: string;
}

export function useCreateJourneyStep() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateJourneyStepData) => {
      const { data: result, error } = await supabase
        .from("customer_journey_steps")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["journey-steps", variables.contact_id] 
      });
      toast({
        title: "Etapa criada",
        description: "A etapa do onboarding foi criada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar etapa",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
