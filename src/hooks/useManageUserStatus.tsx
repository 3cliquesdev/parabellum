import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ManageUserStatusParams {
  user_id: string;
  action: 'block' | 'unblock' | 'archive' | 'unarchive';
  reason?: string;
}

export function useManageUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user_id, action, reason }: ManageUserStatusParams) => {
      const { data, error } = await supabase.functions.invoke('manage-user-status', {
        body: { user_id, action, reason }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      
      const actionMessages = {
        block: 'Usuário bloqueado com sucesso',
        unblock: 'Usuário desbloqueado com sucesso',
        archive: 'Usuário arquivado com sucesso',
        unarchive: 'Usuário desarquivado com sucesso'
      };
      
      toast.success(actionMessages[variables.action]);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao gerenciar status do usuário');
    }
  });
}
