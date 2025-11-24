import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useDeleteStage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Verificar se há deals nesta etapa
      const { data: deals, error: checkError } = await supabase
        .from("deals")
        .select("id")
        .eq("stage_id", id)
        .limit(1);

      if (checkError) throw checkError;

      if (deals && deals.length > 0) {
        throw new Error("Não é possível deletar etapa com negócios vinculados");
      }

      const { error } = await supabase
        .from("stages")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stages"] });
      toast({
        title: "Etapa deletada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao deletar etapa",
        description: error.message,
      });
    },
  });
}
