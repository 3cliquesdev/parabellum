import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

export interface EnrichedComment {
  id: string;
  ticket_id: string;
  content: string;
  is_internal: boolean;
  source: string | null;
  created_at: string;
  created_by: string | null;
  attachments: Json | null;
  created_by_user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  display_name: string;
  is_customer_comment: boolean;
}

export function useTicketComments(ticketId: string | null) {
  return useQuery({
    queryKey: ["ticket-comments", ticketId],
    queryFn: async (): Promise<EnrichedComment[]> => {
      if (!ticketId) return [];

      // Buscar ticket para pegar customer_id e nome do cliente
      const { data: ticket } = await supabase
        .from("tickets")
        .select(`
          customer_id,
          customer:contacts(first_name, last_name)
        `)
        .eq("id", ticketId)
        .single();

      const { data, error } = await supabase
        .from("ticket_comments")
        .select(`
          *,
          created_by_user:profiles!ticket_comments_created_by_fkey(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Montar nome do cliente
      const customerName = ticket?.customer
        ? `${ticket.customer.first_name || ''} ${ticket.customer.last_name || ''}`.trim() || 'Cliente'
        : 'Cliente';

      // Enriquecer comentários com informações de exibição
      return (data || []).map((comment) => {
        const isCustomerComment = comment.source === 'customer' || comment.source === 'email_reply';
        
        return {
          ...comment,
          display_name: isCustomerComment
            ? customerName
            : comment.created_by_user?.full_name || 'Equipe de Suporte',
          is_customer_comment: isCustomerComment,
        };
      });
    },
    enabled: !!ticketId,
  });
}
