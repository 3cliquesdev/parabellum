import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TicketOperation {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
}

export function useTicketOperations() {
  return useQuery({
    queryKey: ["ticket-operations"],
    queryFn: async (): Promise<TicketOperation[]> => {
      const { data, error } = await supabase
        .from("ticket_operations" as any)
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return (data as any) || [];
    },
  });
}
