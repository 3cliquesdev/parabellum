import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DateRange } from "react-day-picker";
import { differenceInDays } from "date-fns";

export interface DealsConversionAnalysis {
  totalCreated: number;
  totalWon: number;
  totalLost: number;
  totalOpen: number;
  createdToWonRate: number;
  createdToLostRate: number;
  avgTimeToWinDays: number;
  medianTimeToWinDays: number;
  minTimeToWinDays: number;
  maxTimeToWinDays: number;
}

export function useDealsConversionAnalysis(dateRange?: DateRange) {
  return useQuery({
    queryKey: ["deals-conversion-analysis", dateRange?.from, dateRange?.to],
    queryFn: async (): Promise<DealsConversionAnalysis> => {
      console.log("📊 useDealsConversionAnalysis: Fetching data...");

      let query = supabase
        .from("deals")
        .select("id, status, created_at, closed_at");

      // Filter by creation date range
      if (dateRange?.from) {
        query = query.gte("created_at", dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte("created_at", dateRange.to.toISOString());
      }

      const { data: deals, error } = await query;

      if (error) {
        console.error("❌ useDealsConversionAnalysis error:", error);
        throw error;
      }

      const totalCreated = deals?.length || 0;
      const wonDeals = deals?.filter((d) => d.status === "won") || [];
      const lostDeals = deals?.filter((d) => d.status === "lost") || [];
      const openDeals = deals?.filter((d) => d.status === "open") || [];

      const totalWon = wonDeals.length;
      const totalLost = lostDeals.length;
      const totalOpen = openDeals.length;

      // Calculate conversion rates (created -> won/lost)
      const createdToWonRate = totalCreated > 0 ? (totalWon / totalCreated) * 100 : 0;
      const createdToLostRate = totalCreated > 0 ? (totalLost / totalCreated) * 100 : 0;

      // Calculate time to win for won deals
      const timeToWinDays: number[] = [];
      wonDeals.forEach((deal) => {
        if (deal.closed_at && deal.created_at) {
          const days = differenceInDays(
            new Date(deal.closed_at),
            new Date(deal.created_at)
          );
          if (days >= 0) {
            timeToWinDays.push(days);
          }
        }
      });

      // Calculate statistics
      let avgTimeToWinDays = 0;
      let medianTimeToWinDays = 0;
      let minTimeToWinDays = 0;
      let maxTimeToWinDays = 0;

      if (timeToWinDays.length > 0) {
        // Average
        avgTimeToWinDays = Math.round(
          timeToWinDays.reduce((a, b) => a + b, 0) / timeToWinDays.length
        );

        // Sort for median, min, max
        const sorted = [...timeToWinDays].sort((a, b) => a - b);
        minTimeToWinDays = sorted[0];
        maxTimeToWinDays = sorted[sorted.length - 1];

        // Median
        const mid = Math.floor(sorted.length / 2);
        medianTimeToWinDays =
          sorted.length % 2 !== 0
            ? sorted[mid]
            : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
      }

      console.log("✅ useDealsConversionAnalysis:", {
        totalCreated,
        totalWon,
        createdToWonRate: createdToWonRate.toFixed(1),
        avgTimeToWinDays,
      });

      return {
        totalCreated,
        totalWon,
        totalLost,
        totalOpen,
        createdToWonRate,
        createdToLostRate,
        avgTimeToWinDays,
        medianTimeToWinDays,
        minTimeToWinDays,
        maxTimeToWinDays,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
