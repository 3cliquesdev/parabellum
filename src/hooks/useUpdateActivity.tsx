import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type ActivityUpdate = {
  id: string;
  title?: string;
  description?: string;
  type?: Tables<"activities">["type"];
  due_date?: string;
  assigned_to?: string;
  completed?: boolean;
};

export function useUpdateActivity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: ActivityUpdate) => {
      const { data: result, error } = await supabase
        .from("activities")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      if (result.contact_id) {
        queryClient.invalidateQueries({ 
          queryKey: ["customer-timeline", result.contact_id] 
        });
      }
      if (result.deal_id) {
        queryClient.invalidateQueries({ 
          queryKey: ["next-activity", result.deal_id] 
        });
      }
      toast({ 
        title: "Atividade atualizada", 
        description: "As alterações foram salvas" 
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar atividade",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
