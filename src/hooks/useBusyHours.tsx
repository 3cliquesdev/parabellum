import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HeatmapCell {
  day: number; // 0-6 (Sunday-Saturday)
  hour: number; // 0-23
  count: number;
}

export function useBusyHours(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ["busy-hours", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      console.log("📊 useBusyHours: Fetching heatmap data", { startDate, endDate });
      
      const { data, error } = await supabase.rpc(
        "get_conversation_heatmap",
        {
          p_start: startDate.toISOString(),
          p_end: endDate.toISOString()
        }
      );

      if (error) {
        console.error("❌ Error fetching heatmap:", error);
        throw error;
      }

      const heatmapData: HeatmapCell[] = (data || []).map((row: any) => ({
        day: row.day_of_week,
        hour: row.hour_of_day,
        count: Number(row.count)
      }));

      console.log("✅ Heatmap data fetched:", heatmapData.length, "cells");
      return heatmapData;
    },
    staleTime: 1000 * 60 * 5,
  });
}
