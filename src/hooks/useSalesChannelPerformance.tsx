import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRole } from "./useUserRole";

export interface SalesChannelData {
  source: string;
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  conversionRate: number;
  avgTicket: number;
  totalRevenue: number;
}

export const useSalesChannelPerformance = (startDate: Date, endDate: Date) => {
  const { user } = useAuth();
  const { role } = useUserRole();

  return useQuery({
    queryKey: ["sales-channel-performance", startDate, endDate, user?.id, role],
    queryFn: async (): Promise<SalesChannelData[]> => {
      // Fetch all deals with contact source
      let query = supabase
        .from("deals")
        .select(`
          id,
          status,
          value,
          created_at,
          contact:contacts!deals_contact_id_fkey(source)
        `)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Role-based filtering for sales_rep
      if (role === "sales_rep" && user?.id) {
        query = query.eq("assigned_to", user.id);
      }

      const { data: deals, error } = await query;

      if (error) throw error;
      if (!deals) return [];

      // Group by source
      const sourceMap = new Map<string, {
        total: number;
        won: number;
        lost: number;
        revenue: number;
      }>();

      deals.forEach((deal) => {
        const source = (deal.contact as any)?.source || "Não informado";
        
        if (!sourceMap.has(source)) {
          sourceMap.set(source, { total: 0, won: 0, lost: 0, revenue: 0 });
        }

        const stats = sourceMap.get(source)!;
        stats.total += 1;

        if (deal.status === "won") {
          stats.won += 1;
          stats.revenue += deal.value || 0;
        } else if (deal.status === "lost") {
          stats.lost += 1;
        }
      });

      // Convert to array with calculated metrics
      const result: SalesChannelData[] = Array.from(sourceMap.entries())
        .map(([source, stats]) => ({
          source,
          totalDeals: stats.total,
          wonDeals: stats.won,
          lostDeals: stats.lost,
          conversionRate: stats.total > 0 ? (stats.won / stats.total) * 100 : 0,
          avgTicket: stats.won > 0 ? stats.revenue / stats.won : 0,
          totalRevenue: stats.revenue,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      return result;
    },
    enabled: !!user,
  });
};
