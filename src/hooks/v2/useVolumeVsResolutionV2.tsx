import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupportFilters } from "@/context/SupportFiltersContext";

export interface VolumeDataPoint {
  date_bucket: string;
  opened: number;
  resolved: number;
}

export function useVolumeVsResolutionV2() {
  const { appliedFilters, getEndExclusive } = useSupportFilters();

  return useQuery({
    queryKey: [
      "volume-vs-resolution-v2",
      appliedFilters.startDate.toISOString(),
      getEndExclusive().toISOString(),
      appliedFilters.channel,
      appliedFilters.departmentId,
      appliedFilters.agentId,
    ],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_volume_vs_resolution_v2", {
        p_start: appliedFilters.startDate.toISOString(),
        p_end: getEndExclusive().toISOString(),
        p_channel: appliedFilters.channel,
        p_department_id: appliedFilters.departmentId,
        p_agent_id: appliedFilters.agentId,
      });

      if (error) throw error;

      return (data ?? []) as VolumeDataPoint[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
