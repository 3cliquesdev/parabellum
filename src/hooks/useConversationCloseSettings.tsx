import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useConversationCloseSettings() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["conversation-close-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_configurations")
        .select("value")
        .eq("key", "conversation_tags_required")
        .maybeSingle();

      if (error) {
        console.error("[useConversationCloseSettings] Error:", error);
        return false;
      }

      return data?.value === "true";
    },
    staleTime: 30000,
  });

  const updateSetting = useMutation({
    mutationFn: async (required: boolean) => {
      const { error } = await supabase
        .from("system_configurations")
        .upsert(
          {
            key: "conversation_tags_required",
            value: required ? "true" : "false",
            category: "inbox",
            description: "Tags obrigatórias ao encerrar conversas de chat",
          },
          { onConflict: "key" }
        );
      if (error) throw error;
    },
    onMutate: async (required) => {
      await queryClient.cancelQueries({ queryKey: ["conversation-close-settings"] });
      const previous = queryClient.getQueryData<boolean>(["conversation-close-settings"]);
      queryClient.setQueryData(["conversation-close-settings"], required);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["conversation-close-settings"], context.previous);
      }
      toast.error("Erro ao atualizar configuração");
    },
    onSuccess: () => {
      toast.success("Configuração atualizada");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation-close-settings"] });
    },
  });

  return {
    tagsRequired: data ?? false,
    isLoading,
    updateTagsRequired: updateSetting.mutate,
  };
}
