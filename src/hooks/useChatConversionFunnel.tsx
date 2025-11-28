import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
}

export function useChatConversionFunnel(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ["chat-conversion-funnel", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      console.log("📊 useChatConversionFunnel: Fetching funnel data", { startDate, endDate });
      
      // Stage 1: Total conversations started
      const { data: conversationsData, error: convError } = await supabase
        .from("conversations")
        .select("id", { count: "exact" })
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (convError) throw convError;
      const totalConversations = conversationsData?.length || 0;

      // Stage 2: Leads qualified (contacts created from conversations in period)
      const { data: leadsData, error: leadsError } = await supabase
        .from("contacts")
        .select("id", { count: "exact" })
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (leadsError) throw leadsError;
      const totalLeads = leadsData?.length || 0;

      // Stage 3: Deals created in period
      const { data: dealsData, error: dealsError } = await supabase
        .from("deals")
        .select("id, status", { count: "exact" })
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (dealsError) throw dealsError;
      const totalDeals = dealsData?.length || 0;

      // Stage 4: Deals won
      const totalWon = dealsData?.filter(d => d.status === "won").length || 0;

      // Calculate funnel
      const funnel: FunnelStage[] = [
        {
          stage: "Conversas Iniciadas",
          count: totalConversations,
          percentage: 100
        },
        {
          stage: "Leads Gerados",
          count: totalLeads,
          percentage: totalConversations > 0 ? (totalLeads / totalConversations) * 100 : 0
        },
        {
          stage: "Deals Criados",
          count: totalDeals,
          percentage: totalConversations > 0 ? (totalDeals / totalConversations) * 100 : 0
        },
        {
          stage: "Vendas Fechadas",
          count: totalWon,
          percentage: totalConversations > 0 ? (totalWon / totalConversations) * 100 : 0
        }
      ];

      console.log("✅ Funnel data fetched:", funnel);
      return funnel;
    },
    staleTime: 1000 * 60 * 5,
  });
}
