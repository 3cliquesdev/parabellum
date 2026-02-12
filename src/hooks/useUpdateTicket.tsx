import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface UpdateTicketData {
  status?: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string | null;
  subject?: string;
  description?: string;
  department_id?: string;
  attachments?: any[];
  origin_id?: string;
}

/**
 * Helper: cria evento canônico em ticket_events + chama notify-ticket-event com email + in_app.
 * Não quebra o fluxo se falhar (loga erro e continua).
 */
async function createEventAndNotify({
  ticket_id,
  event_type,
  actor_id,
  old_value,
  new_value,
  metadata,
}: {
  ticket_id: string;
  event_type: string;
  actor_id?: string | null;
  old_value?: any;
  new_value?: any;
  metadata?: any;
}) {
  let eventId: string | null = null;

  try {
    const { data: ev, error: evErr } = await supabase
      .from("ticket_events")
      .insert({
        ticket_id,
        event_type,
        actor_id: actor_id ?? null,
        metadata: metadata ?? {},
      })
      .select("id")
      .single();

    if (evErr) {
      console.error("[useUpdateTicket] ticket_events insert failed:", evErr);
    } else {
      eventId = ev?.id ?? null;
    }
  } catch (insertErr) {
    console.error("[useUpdateTicket] ticket_events insert exception:", insertErr);
  }

  try {
    await supabase.functions.invoke("notify-ticket-event", {
      body: {
        ticket_id,
        event_type,
        actor_id: actor_id ?? null,
        old_value: old_value ?? null,
        new_value: new_value ?? null,
        ticket_event_id: eventId,
        channels: ["email", "in_app"],
        metadata: metadata ?? {},
      },
    });
    console.log(`[useUpdateTicket] Notified ${event_type} (event_id=${eventId})`);
  } catch (notifyErr) {
    console.error("[useUpdateTicket] notify-ticket-event failed:", notifyErr);
  }

  return eventId;
}

export function useUpdateTicket() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, updates, statusNote }: { id: string; updates: UpdateTicketData; statusNote?: string }) => {
      // Buscar estado anterior para comparação (status + assigned_to)
      const { data: currentTicket } = await supabase
        .from("tickets")
        .select("status, assigned_to")
        .eq("id", id)
        .maybeSingle();

      const previousStatus = currentTicket?.status;
      const previousAssignedTo = currentTicket?.assigned_to;
      const updateData: any = { ...updates };

      // Se status mudou para resolved ou closed, adicionar resolved_at
      if (updates.status === 'resolved' || updates.status === 'closed') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("tickets")
        .update(updateData)
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) throw error;

      // Se UPDATE funcionou mas SELECT retornou vazio (RLS), retornar objeto mínimo
      if (!data) {
        console.warn('[useUpdateTicket] Update succeeded but SELECT returned empty (RLS restriction)');
        return { id, ...updates } as any;
      }

      const actorId = user?.id ?? null;

      // --- Evento de STATUS (só se mudou de fato) ---
      if (updates.status && updates.status !== previousStatus) {
        const eventType =
          updates.status === 'resolved' ? 'resolved' :
          updates.status === 'closed'   ? 'closed'   :
          'status_changed';

        await createEventAndNotify({
          ticket_id: id,
          event_type: eventType,
          actor_id: actorId,
          old_value: previousStatus,
          new_value: updates.status,
          metadata: {
            old_status: previousStatus,
            new_status: updates.status,
            note: statusNote ?? null,
          },
        });
      }

      // --- Evento de ATRIBUIÇÃO (só se mudou de fato) ---
      if (updates.assigned_to !== undefined && updates.assigned_to !== previousAssignedTo) {
        await createEventAndNotify({
          ticket_id: id,
          event_type: 'assigned',
          actor_id: actorId,
          old_value: previousAssignedTo ?? null,
          new_value: updates.assigned_to ?? null,
          metadata: {
            old_assigned_to: previousAssignedTo ?? null,
            new_assigned_to: updates.assigned_to ?? null,
          },
        });
      }

      // Enviar notificação de status para o cliente externo
      const notifiableStatuses = ['waiting_customer', 'resolved', 'closed'];
      if (updates.status && notifiableStatuses.includes(updates.status)) {
        try {
          await supabase.functions.invoke('send-ticket-status-notification', {
            body: {
              ticket_id: id,
              new_status: updates.status,
              note: statusNote,
            },
          });
          console.log(`[useUpdateTicket] Customer notification sent for ${updates.status}`);
        } catch (notifError) {
          console.error('[useUpdateTicket] Failed to send customer notification:', notifError);
        }
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", data.id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-counts"] });
      toast({
        title: "Ticket atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar ticket",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
