import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type AutomationUpdate = {
  id: string;
  name?: string;
  description?: string;
  trigger_conditions?: any;
  action_config?: any;
  is_active?: boolean;
};

export function useUpdateAutomation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: AutomationUpdate) => {
      const { data: result, error } = await supabase
        .from("automations")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast({
        title: "Automação atualizada",
        description: "As alterações foram salvas com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar automação",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
