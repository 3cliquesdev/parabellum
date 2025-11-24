import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateStageData {
  name: string;
  pipeline_id: string;
}

export function useCreateStage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateStageData) => {
      // Buscar maior position atual
      const { data: maxStage } = await supabase
        .from("stages")
        .select("position")
        .eq("pipeline_id", data.pipeline_id)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextPosition = (maxStage?.position ?? -1) + 1;

      const { error } = await supabase
        .from("stages")
        .insert({
          name: data.name,
          pipeline_id: data.pipeline_id,
          position: nextPosition,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stages"] });
      toast({
        title: "Etapa criada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar etapa",
        description: error.message,
      });
    },
  });
}
