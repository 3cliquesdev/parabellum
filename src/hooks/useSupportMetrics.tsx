import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SupportMetrics {
  avgFRT: number; // Average First Response Time in minutes
  avgMTTR: number; // Average Mean Time To Resolution in minutes
  avgCSAT: number; // Average CSAT score (1-5)
  totalRatings: number;
}

export function useSupportMetrics(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ["support-metrics", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      console.log("📊 useSupportMetrics: Fetching support metrics", { startDate, endDate });
      
      // Calculate FRT (First Response Time)
      const { data: frtData, error: frtError } = await supabase.rpc(
        "get_avg_first_response_time",
        {
          p_start: startDate.toISOString(),
          p_end: endDate.toISOString()
        }
      );

      if (frtError) {
        console.error("❌ Error fetching FRT:", frtError);
        throw frtError;
      }
      
      // Calculate MTTR (Mean Time To Resolution)
      const { data: mttrData, error: mttrError } = await supabase.rpc(
        "get_avg_resolution_time",
        {
          p_start: startDate.toISOString(),
          p_end: endDate.toISOString()
        }
      );

      if (mttrError) {
        console.error("❌ Error fetching MTTR:", mttrError);
        throw mttrError;
      }
      
      // Calculate CSAT average
      const { data: csatData, error: csatError } = await supabase
        .from("conversation_ratings")
        .select("rating")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (csatError) {
        console.error("❌ Error fetching CSAT:", csatError);
        throw csatError;
      }
      
      const avgCSAT = csatData?.length 
        ? csatData.reduce((sum, r) => sum + r.rating, 0) / csatData.length 
        : 0;

      const metrics: SupportMetrics = {
        avgFRT: frtData || 0,
        avgMTTR: mttrData || 0,
        avgCSAT: avgCSAT,
        totalRatings: csatData?.length || 0
      };

      console.log("✅ Support metrics fetched:", metrics);
      return metrics;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
