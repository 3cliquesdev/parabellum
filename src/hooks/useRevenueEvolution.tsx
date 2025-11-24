import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRole } from "./useUserRole";
import { format, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export function useRevenueEvolution() {
  const { user } = useAuth();
  const { role } = useUserRole();

  return useQuery({
    queryKey: ["revenue-evolution", user?.id, role],
    queryFn: async () => {
      // Buscar deals ganhos nos últimos 6 meses
      const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));

      let query = supabase
        .from("deals")
        .select("value, closed_at")
        .eq("status", "won")
        .gte("closed_at", sixMonthsAgo.toISOString())
        .order("closed_at", { ascending: true });

      // Sales rep vê apenas seus próprios dados
      if (role === "sales_rep" && user?.id) {
        query = query.eq("assigned_to", user.id);
      }

      const { data: deals, error } = await query;

      if (error) throw error;

      // Agrupar por mês
      const revenueByMonth = new Map<
        string,
        { month: string; revenue: number; dealsCount: number }
      >();

      // Inicializar últimos 6 meses
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

      // Adicionar valores dos deals
      deals?.forEach((deal) => {
        if (deal.closed_at) {
          const monthKey = format(new Date(deal.closed_at), "yyyy-MM");
          const monthData = revenueByMonth.get(monthKey);

          if (monthData) {
            monthData.revenue += deal.value || 0;
            monthData.dealsCount += 1;
          }
        }
      });

      return Array.from(revenueByMonth.values());
    },
  });
}
