import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export function useRevenueEvolution() {
  return useQuery({
    queryKey: ["revenue-evolution-kiwify"],
    queryFn: async () => {
      const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));
      
      console.log("📊 useRevenueEvolution: Buscando dados de kiwify_events", {
        desde: sixMonthsAgo.toISOString()
      });

      // Buscar eventos pagos dos últimos 6 meses
      const { data: paidEvents, error: paidError } = await supabase
        .from("kiwify_events")
        .select("payload, created_at")
        .in("event_type", ["paid", "order_approved"])
        .gte("created_at", sixMonthsAgo.toISOString())
        .order("created_at", { ascending: true });

      if (paidError) {
        console.error("❌ useRevenueEvolution: Erro ao buscar eventos:", paidError);
        throw paidError;
      }

      // Buscar order_ids reembolsados/chargebacks para excluir
      const { data: refundedEvents } = await supabase
        .from("kiwify_events")
        .select("payload")
        .in("event_type", ["refunded", "chargedback"]);

      const refundedOrderIds = new Set<string>();
      refundedEvents?.forEach(event => {
        const orderId = (event.payload as any)?.order_id;
        if (orderId) refundedOrderIds.add(orderId);
      });

      console.log(`📊 useRevenueEvolution: ${refundedOrderIds.size} pedidos reembolsados excluídos`);

      // Deduplicar por order_id e excluir reembolsos
      const uniqueOrdersMap = new Map<string, any>();
      paidEvents?.forEach(event => {
        const orderId = (event.payload as any)?.order_id;
        if (!orderId) return;
        if (refundedOrderIds.has(orderId)) return;
        if (!uniqueOrdersMap.has(orderId)) {
          uniqueOrdersMap.set(orderId, event);
        }
      });

      const events = Array.from(uniqueOrdersMap.values());
      console.log(`✅ useRevenueEvolution: ${events.length} pedidos únicos`);

      // Inicializar últimos 6 meses
      const revenueByMonth = new Map<
        string,
        { month: string; revenue: number; dealsCount: number }
      >();

      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthKey = format(monthDate, "yyyy-MM");
        const monthLabel = format(monthDate, "MMM yyyy", { locale: ptBR });

        revenueByMonth.set(monthKey, {
          month: monthLabel,
          revenue: 0,
          dealsCount: 0,
        });
      }

      // Adicionar valores dos eventos kiwify
      events.forEach((event) => {
        const monthKey = format(new Date(event.created_at), "yyyy-MM");
        const monthData = revenueByMonth.get(monthKey);

        if (monthData) {
          // Usar my_commission (receita líquida após taxas Kiwify)
          const commissions = (event.payload as any)?.Commissions;
          const netValue = (commissions?.my_commission || 0) / 100;
          
          monthData.revenue += netValue;
          monthData.dealsCount += 1;
        }
      });

      const result = Array.from(revenueByMonth.values());
      console.log("✅ useRevenueEvolution: Dados calculados", result);
      
      return result;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
