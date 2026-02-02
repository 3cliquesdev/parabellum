import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupportFilters } from "@/context/SupportFiltersContext";

export interface SLAComplianceV2 {
  on_time: number;
  overdue: number;
  pending: number;
  total: number;
  compliance_rate: number;
}

export function useSLAComplianceV2() {
  const { appliedFilters, getEndExclusive } = useSupportFilters();

  return useQuery({
    queryKey: [
      "sla-compliance-v2",
      appliedFilters.startDate.toISOString(),
      getEndExclusive().toISOString(),
      appliedFilters.channel,
      appliedFilters.departmentId,
      appliedFilters.agentId,
      appliedFilters.status,
    ],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_sla_compliance_v2", {
        p_start: appliedFilters.startDate.toISOString(),
        p_end: getEndExclusive().toISOString(),
        p_channel: appliedFilters.channel,
        p_department_id: appliedFilters.departmentId,
        p_agent_id: appliedFilters.agentId,
        p_status: appliedFilters.status,
      });

      if (error) throw error;

      const result = data?.[0] ?? {
        on_time: 0,
        overdue: 0,
        pending: 0,
        total: 0,
        compliance_rate: 0,
      };

      return result as SLAComplianceV2;
    },
    staleTime: 1000 * 60 * 2,
  });
}
