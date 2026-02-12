import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface TransferData {
  ticket_id: string;
  department_id: string;
  internal_note: string;
  assigned_to?: string | null;
}

/**
 * Hook para transferir tickets entre departamentos/agentes
 * Usa RPC SECURITY DEFINER para bypassar RLS com validação
 */
export function useTicketTransfer() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ ticket_id, department_id, internal_note, assigned_to }: TransferData) => {
      console.log('[useTicketTransfer] RPC call:', {
        ticket_id,
        department_id,
        assigned_to,
        internal_note: internal_note?.substring(0, 50)
      });

      // Chamar RPC SECURITY DEFINER - bypassa RLS com validação
      const { data: result, error } = await supabase
        .rpc('transfer_ticket_secure', {
          p_ticket_id: ticket_id,
          p_department_id: department_id,
          p_assigned_to: assigned_to ?? null,
          p_internal_note: internal_note || null
        });

      if (error) {
        console.error('[useTicketTransfer] RPC error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          ticket_id,
          department_id,
          assigned_to
        });
        throw error;
      }

      const transferResult = result as {
        success: boolean;
        error?: string;
        ticket_id?: string;
        department_id?: string;
        department_name?: string;
        assigned_to?: string;
        assignee_name?: string;
      } | null;

      if (!transferResult?.success) {
        console.error('[useTicketTransfer] Transfer failed:', transferResult?.error);
        throw new Error(transferResult?.error || 'Erro ao transferir ticket');
      }

      console.log('[useTicketTransfer] ✅ Ticket transferido com sucesso:', transferResult);

      // --- Criar evento canônico + notificar com email + in_app ---
      const actorId = user?.id ?? null;
      const metadata = {
        to_department_id: department_id,
        to_department: transferResult.department_name ?? null,
        assigned_to: transferResult.assigned_to ?? null,
        assignee_name: transferResult.assignee_name ?? null,
        internal_note: internal_note ?? null,
      };

      let eventId: string | null = null;

      try {
        const { data: ev, error: evErr } = await supabase
          .from("ticket_events")
          .insert({
            ticket_id,
            event_type: "transferred",
            actor_id: actorId,
            metadata,
          })
          .select("id")
          .single();

        if (evErr) {
          console.error("[useTicketTransfer] ticket_events insert failed:", evErr);
        } else {
          eventId = ev?.id ?? null;
        }
      } catch (insertErr) {
        console.error("[useTicketTransfer] ticket_events insert exception:", insertErr);
      }

      try {
        await supabase.functions.invoke("notify-ticket-event", {
          body: {
            ticket_id,
            event_type: "transferred",
            actor_id: actorId,
            old_value: null,
            new_value: department_id,
            ticket_event_id: eventId,
            channels: ["email", "in_app"],
            metadata,
          },
        });
        console.log(`[useTicketTransfer] Notified transferred (event_id=${eventId})`);
      } catch (notifyErr) {
        console.error("[useTicketTransfer] notify-ticket-event failed:", notifyErr);
      }

      return {
        id: ticket_id,
        department: { name: transferResult.department_name }
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-comments", data.id] });

      toast({
        title: "✅ Ticket Transferido",
        description: `Enviado para ${data.department?.name || 'novo departamento'}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao transferir ticket",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
