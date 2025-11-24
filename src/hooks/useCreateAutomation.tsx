import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type AutomationInsert = Omit<Tables<"automations">, "id" | "created_at" | "updated_at" | "created_by"> & {
  action_config: any;
};

export function useCreateAutomation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: AutomationInsert) => {
      const { data: result, error } = await supabase
        .from("automations")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast({
        title: "Automação criada",
        description: "A automação foi criada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar automação",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
