import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { differenceInDays } from "date-fns";

export interface ExpansionOpportunity {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  subscription_plan: string | null;
  recent_orders_count: number | null;
  account_balance: number | null;
  health_score: string;
  created_at: string;
  onboarding_progress: number;
  reason: string;
  estimated_commission: number;
}

export function useExpansionOpportunities() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["expansion-opportunities", user?.id],
    queryFn: async () => {
      if (!user) return [];

      console.log("🎯 useExpansionOpportunities: Fetching expansion opportunities");

      // Buscar clientes do consultor com status 'customer'
      const { data: contacts, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, company, subscription_plan, recent_orders_count, account_balance, created_at, consultant_id")
        .eq("consultant_id", user.id)
        .eq("status", "customer");

      if (error) {
        console.error("❌ Error fetching contacts:", error);
        throw error;
      }

      if (!contacts || contacts.length === 0) {
        console.log("⚠️ No contacts found for consultant");
        return [];
      }

      // Calcular média de pedidos da carteira
      const avgOrders = contacts.reduce((sum, c) => sum + (c.recent_orders_count || 0), 0) / contacts.length;

      // Processar cada cliente para calcular health score e onboarding progress
      const opportunities: ExpansionOpportunity[] = [];

      for (const contact of contacts) {
        // Calcular health score baseado em last_contact_date
        const { data: interactions } = await supabase
          .from("interactions")
          .select("created_at")
          .eq("customer_id", contact.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const lastContactDate = interactions?.[0]?.created_at;
        const daysSinceContact = lastContactDate 
          ? differenceInDays(new Date(), new Date(lastContactDate))
          : 999;

        let health_score = "yellow";
        if (daysSinceContact <= 7) health_score = "green";
        else if (daysSinceContact > 30) health_score = "red";

        // Calcular onboarding progress
        const { data: steps } = await supabase
          .from("customer_journey_steps")
          .select("id, completed")
          .eq("contact_id", contact.id);

        const totalSteps = steps?.length || 0;
        const completedSteps = steps?.filter(s => s.completed).length || 0;
        const onboarding_progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 100;

        // Calcular dias ativo
        const daysActive = differenceInDays(new Date(), new Date(contact.created_at));

        // Aplicar lógica de detecção de oportunidades
        let reason = "";
        let isOpportunity = false;

        if (health_score === "green") {
          // Critério 1: Uso intenso (pedidos acima da média)
          if ((contact.recent_orders_count || 0) > avgOrders * 1.5) {
            reason = `Cliente usando muito o sistema (${contact.recent_orders_count} pedidos). Ofereça upgrade.`;
            isOpportunity = true;
          }
          
          // Critério 2: Pagando e em plano básico
          if (!isOpportunity && contact.account_balance && contact.account_balance > 0 && contact.subscription_plan?.toLowerCase().includes("básico")) {
            reason = `Cliente em plano Básico com saldo positivo. Potencial para upgrade.`;
            isOpportunity = true;
          }

          // Critério 3: Onboarding recente completo
          if (!isOpportunity && onboarding_progress === 100 && daysActive < 60) {
            reason = `Onboarding recém-completo (${daysActive} dias ativo). Cliente engajado para upgrade.`;
            isOpportunity = true;
          }
        }

        if (isOpportunity) {
          // Calcular comissão estimada (assumindo upgrade de R$ 200 com 5% comissão)
          const estimated_commission = 200 * 0.05; // R$ 10 por upgrade

          opportunities.push({
            id: contact.id,
            first_name: contact.first_name,
            last_name: contact.last_name,
            company: contact.company,
            subscription_plan: contact.subscription_plan,
            recent_orders_count: contact.recent_orders_count,
            account_balance: contact.account_balance,
            health_score,
            created_at: contact.created_at,
            onboarding_progress,
            reason,
            estimated_commission,
          });
        }
      }

      // Retornar top 5 oportunidades ordenadas por pedidos recentes
      const topOpportunities = opportunities
        .sort((a, b) => (b.recent_orders_count || 0) - (a.recent_orders_count || 0))
        .slice(0, 5);

      console.log(`✅ Found ${topOpportunities.length} expansion opportunities`);
      return topOpportunities;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
