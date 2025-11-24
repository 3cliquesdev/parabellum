import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useDeleteActivity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase
        .from("activities")
        .delete()
        .eq("id", activityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast({ 
        title: "Atividade deletada", 
        description: "A atividade foi removida com sucesso" 
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao deletar atividade",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
