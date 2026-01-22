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

export function useTicketTransfer() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ ticket_id, department_id, internal_note, assigned_to }: TransferData) => {
      // Buscar dados atuais do ticket
      const { data: currentTicket } = await supabase
        .from("tickets")
        .select("department_id, assigned_to, departments(name)")
        .eq("id", ticket_id)
        .single();
      
      const previousDepartment = (currentTicket?.departments as any)?.name || "Desconhecido";
      const previousAssignedTo = currentTicket?.assigned_to;

      // Verificar se é um "retorno" - se o assigned_to foi responsável antes
      let isReturning = false;
      if (assigned_to) {
        const { data: previousEvents } = await supabase
          .from("ticket_events")
          .select("metadata")
          .eq("ticket_id", ticket_id)
          .eq("event_type", "transferred")
          .order("created_at", { ascending: false });
        
        isReturning = previousEvents?.some(event => {
          const meta = event.metadata as any;
          return meta?.previous_assigned_to === assigned_to;
        }) || false;
      }

      // Definir status baseado se é retorno ou não
      const newStatus = isReturning ? 'returned' : 'in_progress';

      // Buscar nome do assignee se fornecido
      let assigneeName: string | null = null;
      if (assigned_to) {
        const { data: assignee } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", assigned_to)
          .single();
        assigneeName = assignee?.full_name || null;
      }

      const { data, error } = await supabase
        .from("tickets")
        .update({
          department_id,
          status: newStatus as any, // Dynamic status from ticket_statuses table
          assigned_to: assigned_to ?? null,
        })
        .eq("id", ticket_id)
        .select(`
          *,
          department:departments(name)
        `)
        .single();

      if (error) throw error;

      // Criar comentário interno de transferência
      const assignmentNote = assigneeName ? ` (atribuído para ${assigneeName})` : '';
      await supabase
        .from("ticket_comments")
        .insert({
          ticket_id,
          content: `📤 Ticket transferido para ${data.department?.name}${assignmentNote}\n\n${internal_note}`,
          is_internal: true,
          created_by: user?.id,
        });

      // Notificar stakeholders via edge function
      try {
        await supabase.functions.invoke('notify-ticket-event', {
          body: {
            ticket_id,
            event_type: 'transferred',
            actor_id: user?.id,
            old_value: previousDepartment,
            new_value: department_id,
            metadata: {
              from_department: previousDepartment,
              to_department: data.department?.name,
              previous_assigned_to: previousAssignedTo,
              is_return: isReturning,
              internal_note,
            },
          },
        });
        console.log('[useTicketTransfer] Stakeholders notified');
      } catch (notifyError) {
        console.error('[useTicketTransfer] Failed to notify stakeholders:', notifyError);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-comments", data.id] });
      
      toast({
        title: "✅ Ticket Transferido",
        description: `Enviado para ${data.department?.name}`,
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
