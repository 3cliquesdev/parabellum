import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook para definir/remover um Chat Flow como "Master Flow" (rulebook padrão do Autopilot)
 * 
 * O Master Flow é usado quando nenhum outro fluxo por keyword é acionado.
 * Ele define as configurações padrão (persona, KB, etc.) para o Autopilot.
 */
export function useSetMasterFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ flowId, setAsMaster }: { flowId: string; setAsMaster: boolean }) => {
      if (setAsMaster) {
        // 1. Primeiro, remover is_master_flow de qualquer outro fluxo
        const { error: resetError } = await supabase
          .from('chat_flows')
          .update({ is_master_flow: false })
          .eq('is_master_flow', true);

        if (resetError) {
          console.error('[useSetMasterFlow] Erro ao resetar master flows:', resetError);
          throw resetError;
        }

        // 2. Definir o novo master flow
        const { error: setError } = await supabase
          .from('chat_flows')
          .update({ is_master_flow: true })
          .eq('id', flowId);

        if (setError) throw setError;
      } else {
        // Apenas remover o status de master
        const { error } = await supabase
          .from('chat_flows')
          .update({ is_master_flow: false })
          .eq('id', flowId);

        if (error) throw error;
      }

      return { flowId, setAsMaster };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat-flows'] });
      
      if (variables.setAsMaster) {
        toast.success('🎯 Fluxo definido como Master Flow', {
          description: 'Este fluxo será usado como rulebook padrão do Autopilot'
        });
      } else {
        toast.success('Fluxo removido como Master Flow');
      }
    },
    onError: (error: Error) => {
      console.error('[useSetMasterFlow] Erro:', error);
      toast.error('Erro ao alterar Master Flow', {
        description: error.message
      });
    }
  });
}
