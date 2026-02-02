import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CommercialPivotFilters {
  startDate: Date;
  endDate: Date;
  departmentId?: string;
  agentId?: string;
  status?: string;
  channel?: string;
}

export interface PivotRow {
  department_id: string | null;
  department_name: string;
  category_id: string | null;
  category_name: string;
  category_color: string | null;
  total: number;
}

export function useCommercialConversationsPivot(filters: CommercialPivotFilters) {
  return useQuery({
    queryKey: ["commercial-conversations-pivot", filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_commercial_conversations_pivot", {
        p_start: filters.startDate.toISOString(),
        p_end: filters.endDate.toISOString(),
        p_department_id: filters.departmentId || null,
        p_agent_id: filters.agentId || null,
        p_status: filters.status || null,
        p_channel: filters.channel || null,
      });

      if (error) throw error;
      return (data || []) as PivotRow[];
    },
    staleTime: 30 * 1000,
  });
}
