import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DrilldownFilters {
  startDate: Date;
  endDate: Date;
  departmentId?: string;
  agentId?: string;
  status?: string;
  channel?: string;
  categoryId?: string;
  noTag?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface DrilldownRow {
  conversation_id: string;
  short_id: string;
  contact_name: string;
  contact_phone: string | null;
  agent_name: string | null;
  department_name: string | null;
  category_name: string | null;
  category_color: string | null;
  status: string;
  channel: string;
  created_at: string;
  closed_at: string | null;
  total_count: number;
}

export function useCommercialConversationsDrilldown(
  filters: DrilldownFilters,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["commercial-conversations-drilldown", filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_commercial_conversations_drilldown", {
        p_start: filters.startDate.toISOString(),
        p_end: filters.endDate.toISOString(),
        p_department_id: filters.departmentId || null,
        p_agent_id: filters.agentId || null,
        p_status: filters.status || null,
        p_channel: filters.channel || null,
        p_category_id: filters.categoryId || null,
        p_no_tag: filters.noTag || false,
        p_search: filters.search || null,
        p_limit: filters.limit || 50,
        p_offset: filters.offset || 0,
      });

      if (error) throw error;
      return (data || []) as DrilldownRow[];
    },
    enabled,
    staleTime: 30 * 1000,
  });
}
