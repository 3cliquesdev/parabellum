import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SyncParams {
  instanceId: string;
  limit?: number;
}

interface SyncResult {
  success: boolean;
  imported: number;
  skipped: number;
  failed: number;
  total_chats: number;
  errors?: string[];
  error?: string;
}

export function useSyncWhatsAppHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ instanceId, limit = 50 }: SyncParams): Promise<SyncResult> => {
      console.log('[useSyncWhatsAppHistory] Starting sync for instance:', instanceId);
      
      const { data, error } = await supabase.functions.invoke<SyncResult>('sync-whatsapp-history', {
        body: { 
          instance_id: instanceId, 
          limit 
        }
      });

      if (error) {
        console.error('[useSyncWhatsAppHistory] Function error:', error);
        throw new Error(error.message || 'Failed to sync history');
      }

      if (!data) {
        throw new Error('No response from sync function');
      }

      if (!data.success && data.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });

      toast.success(
        `📥 Histórico importado!`,
        {
          description: `${data.imported} conversas importadas, ${data.skipped} já existiam, ${data.failed} falhas`,
          duration: 5000,
        }
      );
    },
    onError: (error: Error) => {
      console.error('[useSyncWhatsAppHistory] Error:', error);
      toast.error('Erro ao importar histórico', {
        description: error.message,
      });
    },
  });
}
