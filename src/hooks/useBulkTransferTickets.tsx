import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BulkTransferParams {
  ticketIds: string[];
  departmentId: string;
  assignedTo?: string;
  internalNote?: string;
}

/**
 * Hook para transferir múltiplos tickets de uma vez
 * Usa RPC SECURITY DEFINER para bypassar RLS com validação
 */
export function useBulkTransferTickets() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ ticketIds, departmentId, assignedTo, internalNote }: BulkTransferParams) => {
      if (ticketIds.length === 0) {
        throw new Error("Nenhum ticket selecionado");
      }

      console.log('[useBulkTransferTickets] Transferindo', ticketIds.length, 'tickets via RPC');

      const finalAssignedTo = assignedTo === "none" ? null : (assignedTo || null);
      
      // Transferir cada ticket via RPC (garante validação individual)
      const results = await Promise.allSettled(
        ticketIds.map(async (ticketId) => {
          const { data: result, error } = await supabase
            .rpc('transfer_ticket_secure', {
              p_ticket_id: ticketId,
              p_department_id: departmentId,
              p_assigned_to: finalAssignedTo,
              p_internal_note: internalNote || null
            });

          if (error) {
            console.error(`[useBulkTransferTickets] Erro no ticket ${ticketId}:`, error);
            throw error;
          }

          const transferResult = result as { success: boolean; error?: string } | null;
          
          if (!transferResult?.success) {
            throw new Error(transferResult?.error || 'Erro ao transferir');
          }

          return ticketId;
        })
      );

      // Contar sucessos e falhas
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (failed > 0 && successful === 0) {
        throw new Error('Nenhum ticket foi transferido. Verifique suas permissões.');
      }

      console.log(`[useBulkTransferTickets] ✅ ${successful} transferidos, ${failed} falharam`);

      return { successful, failed, total: ticketIds.length };
    },
    onSuccess: ({ successful, failed }) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      
      if (failed > 0) {
        toast({
          title: "Transferência parcial",
          description: `${successful} ticket${successful > 1 ? "s" : ""} transferido${successful > 1 ? "s" : ""}, ${failed} falharam.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Tickets transferidos",
          description: `${successful} ticket${successful > 1 ? "s" : ""} transferido${successful > 1 ? "s" : ""} com sucesso.`,
        });
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao transferir tickets",
        description: error.message,
      });
    },
  });
}
