import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupportFilters } from "@/context/SupportFiltersContext";

export interface SupportMetricsV2 {
  frt_avg_minutes: number | null;
  mttr_avg_minutes: number | null;
  frt_count: number;
  mttr_count: number;
}

export function useSupportMetricsV2() {
  const { appliedFilters, getEndExclusive } = useSupportFilters();

  return useQuery({
    queryKey: [
      "support-metrics-v2",
      appliedFilters.startDate.toISOString(),
      getEndExclusive().toISOString(),
      appliedFilters.channel,
      appliedFilters.departmentId,
      appliedFilters.agentId,
      appliedFilters.status,
    ],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_support_metrics_v2", {
        p_start: appliedFilters.startDate.toISOString(),
        p_end: getEndExclusive().toISOString(),
        p_channel: appliedFilters.channel,
        p_department_id: appliedFilters.departmentId,
        p_agent_id: appliedFilters.agentId,
        p_status: appliedFilters.status,
      });

      if (error) throw error;

      const result = data?.[0] ?? {
        frt_avg_minutes: null,
        mttr_avg_minutes: null,
        frt_count: 0,
        mttr_count: 0,
      };

      return result as SupportMetricsV2;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
