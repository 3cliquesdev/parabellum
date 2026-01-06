import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTicketById(ticketId: string | undefined) {
  return useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      if (!ticketId) throw new Error('Ticket ID is required');
      
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          customer:customer_id(id, first_name, last_name, email, phone, avatar_url, company),
          assigned_user:assigned_to(id, full_name, email, avatar_url),
          created_by_user:created_by(id, full_name, email, avatar_url),
          department:department_id(id, name, color)
        `)
        .eq('id', ticketId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Ticket not found');
      
      return data;
    },
    enabled: !!ticketId,
  });
}
