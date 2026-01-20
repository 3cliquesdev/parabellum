import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatLocalDate } from "@/lib/dateUtils";
import { fetchProductMappings, getMappedProductWithSourceType } from "@/lib/kiwifyProductMapping";

export interface WhoSoldCategory {
  category: string;
  sourceType: string;
  isRecurring: boolean;
  label: string;
  color: string;
  sales: number;
  revenue: number;
  percentage: number;
  avgTicket: number;
}

// Categories for "Who Sold" ranking with New/Recurring split
const CATEGORY_CONFIG: Record<string, { label: string; color: string; priority: number }> = {
  afiliado_novo: { label: "Afiliados - Novas", color: "#F59E0B", priority: 1 },
  afiliado_recorrente: { label: "Afiliados - Recorrentes", color: "#FBBF24", priority: 2 },
  organico_novo: { label: "Orgânico - Novas", color: "#8B5CF6", priority: 3 },
  organico_recorrente: { label: "Orgânico - Recorrentes", color: "#A78BFA", priority: 4 },
  comercial_novo: { label: "Comercial - Novas", color: "#10B981", priority: 5 },
  comercial_recorrente: { label: "Comercial - Recorrentes", color: "#34D399", priority: 6 },
};

export function useWhoSoldMetrics(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ["who-sold-metrics", formatLocalDate(startDate), formatLocalDate(endDate)],
    queryFn: async (): Promise<WhoSoldCategory[]> => {
      const startStr = formatLocalDate(startDate);
      const endStr = formatLocalDate(endDate);

      // Fetch product mappings (includes sourceType)
      const { offerMap, productIdMap } = await fetchProductMappings();

      // Use 7-day margin strategy for database query (same as other Kiwify hooks)
      const marginStart = new Date(startDate);
      marginStart.setDate(marginStart.getDate() - 7);
      const marginEnd = new Date(endDate);
      marginEnd.setDate(marginEnd.getDate() + 7);

      // Fetch ALL paid events (gross sales including refunds)
      const { data: kiwifyEvents, error } = await supabase
        .from("kiwify_events")
        .select("*")
        .eq("event_type", "paid")
        .gte("created_at", marginStart.toISOString())
        .lte("created_at", marginEnd.toISOString());

      if (error) throw error;

      // Deduplicate by order_id and filter by approved_date
      const seenOrders = new Set<string>();
      const categoryMap = new Map<string, { sales: number; revenue: number; sourceType: string; isRecurring: boolean }>();
      let totalRevenue = 0;

      for (const event of kiwifyEvents || []) {
        const payload = event.payload as any;
        if (!payload) continue;

        // Filter by approved_date within the selected period
        const approvedDate = payload.approved_date?.substring(0, 10);
        if (!approvedDate || approvedDate < startStr || approvedDate > endStr) {
          continue;
        }

        // Deduplicate by order_id
        const orderId = payload.order_id || event.id;
        if (seenOrders.has(orderId)) continue;
        seenOrders.add(orderId);

        // Get revenue (gross value)
        const commissions = payload.Commissions || {};
        const grossValue = Number(commissions.product_base_price || 0) / 100;
        totalRevenue += grossValue;

        // Get sourceType from product mapping (the source of truth)
        const mapped = getMappedProductWithSourceType(payload, offerMap, productIdMap);
        const sourceType = mapped.sourceType;

        // Detect if it's a renewal (recurring sale)
        const chargesCompleted = payload.Subscription?.charges?.completed || [];
        const isRecurring = chargesCompleted.length > 1;

        // Create composite category key
        const categoryKey = `${sourceType}_${isRecurring ? 'recorrente' : 'novo'}`;

        // Accumulate stats
        if (!categoryMap.has(categoryKey)) {
          categoryMap.set(categoryKey, { sales: 0, revenue: 0, sourceType, isRecurring });
        }

        const stats = categoryMap.get(categoryKey)!;
        stats.sales++;
        stats.revenue += grossValue;
      }

      // Convert to array with labels and percentages
      const result: WhoSoldCategory[] = Array.from(categoryMap.entries())
        .map(([categoryKey, stats]) => {
          const config = CATEGORY_CONFIG[categoryKey] || {
            label: categoryKey,
            color: "#6B7280",
            priority: 99,
          };
          return {
            category: categoryKey,
            sourceType: stats.sourceType,
            isRecurring: stats.isRecurring,
            label: config.label,
            color: config.color,
            sales: stats.sales,
            revenue: stats.revenue,
            percentage: totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0,
            avgTicket: stats.sales > 0 ? stats.revenue / stats.sales : 0,
          };
        })
        .sort((a, b) => b.revenue - a.revenue);

      return result;
    },
    staleTime: 30 * 1000,
  });
}
