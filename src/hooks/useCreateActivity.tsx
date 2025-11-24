import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type ActivityInsert = {
  deal_id?: string;
  contact_id?: string;
  assigned_to: string;
  type: Tables<"activities">["type"];
  title: string;
  description?: string;
  due_date: string;
  created_by?: string;
};

export function useCreateActivity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ActivityInsert) => {
      const { data: result, error } = await supabase
        .from("activities")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      if (variables.contact_id) {
        queryClient.invalidateQueries({ 
          queryKey: ["customer-timeline", variables.contact_id] 
        });
      }
      toast({ 
        title: "Atividade criada", 
        description: "A atividade foi agendada com sucesso" 
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar atividade",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
