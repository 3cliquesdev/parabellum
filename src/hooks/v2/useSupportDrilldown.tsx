import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupportFilters } from "@/context/SupportFiltersContext";

export interface DrilldownParams {
  metric: string;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface DrilldownTicket {
  id: string;
  ticket_number: string;
  customer_name: string | null;
  agent_name: string | null;
  department_name: string | null;
  channel: string | null;
  status: string;
  created_at: string;
  first_response_at: string | null;
  frt_minutes: number | null;
  resolved_at: string | null;
  mttr_minutes: number | null;
  due_date: string | null;
  sla_status: string | null;
  total_count: number;
}

export interface DrilldownResult {
  data: DrilldownTicket[];
  totalCount: number;
  totalPages: number;
}

export function useSupportDrilldown(params: DrilldownParams, enabled = true) {
  const { appliedFilters, getEndExclusive } = useSupportFilters();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 50;

  return useQuery({
    queryKey: [
      "support-drilldown-v2",
      appliedFilters.startDate.toISOString(),
      getEndExclusive().toISOString(),
      appliedFilters.channel,
      appliedFilters.departmentId,
      appliedFilters.agentId,
      appliedFilters.status,
      params.metric,
      params.search?.trim() || null,
      params.sortBy,
      params.sortDir,
      page,
      pageSize,
    ],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_support_drilldown_v2", {
        p_start: appliedFilters.startDate.toISOString(),
        p_end: getEndExclusive().toISOString(),
        p_metric: params.metric,
        p_channel: appliedFilters.channel,
        p_department_id: appliedFilters.departmentId,
        p_agent_id: appliedFilters.agentId,
        p_status: appliedFilters.status,
        // Refinement #1: Normalize search in frontend
        p_search: params.search?.trim() || null,
        p_sort_by: params.sortBy || "created_at",
        p_sort_dir: params.sortDir || "desc",
        p_limit: pageSize,
        p_offset: (page - 1) * pageSize,
      });

      if (error) throw error;

      const tickets = (data ?? []) as DrilldownTicket[];
      const totalCount = tickets[0]?.total_count ?? 0;

      return {
        data: tickets,
        totalCount: Number(totalCount),
        totalPages: Math.ceil(Number(totalCount) / pageSize),
      } as DrilldownResult;
    },
    enabled,
    staleTime: 1000 * 60 * 2,
  });
}
