import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, eachDayOfInterval } from "date-fns";

export interface VolumeResolutionData {
  date: string;
  opened: number;
  resolved: number;
}

export function useVolumeVsResolution(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ["volume-resolution", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      console.log("📊 useVolumeVsResolution: Fetching volume data", { startDate, endDate });
      
      // Get all conversations opened in period
      const { data: openedData, error: openedError } = await supabase
        .from("conversations")
        .select("created_at")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (openedError) throw openedError;

      // Get all conversations closed in period
      const { data: closedData, error: closedError } = await supabase
        .from("conversations")
        .select("closed_at")
        .gte("closed_at", startDate.toISOString())
        .lte("closed_at", endDate.toISOString())
        .not("closed_at", "is", null);

      if (closedError) throw closedError;

      // Group by date
      const daysInPeriod = eachDayOfInterval({ start: startDate, end: endDate });
      const result: VolumeResolutionData[] = daysInPeriod.map(day => {
        const dateStr = format(day, "yyyy-MM-dd");
        
        const opened = openedData?.filter(c => 
          format(new Date(c.created_at), "yyyy-MM-dd") === dateStr
        ).length || 0;
        
        const resolved = closedData?.filter(c => 
          c.closed_at && format(new Date(c.closed_at), "yyyy-MM-dd") === dateStr
        ).length || 0;

        return {
          date: format(day, "dd/MM"),
          opened,
          resolved
        };
      });

      console.log("✅ Volume data fetched:", result);
      return result;
    },
    staleTime: 1000 * 60 * 5,
  });
}
