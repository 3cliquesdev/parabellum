import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface PortfolioKPIs {
  totalClients: number;
  totalRevenue: number;
  atRiskCount: number;
  newArrivalsCount: number;
}

export function usePortfolioKPIs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["portfolio-kpis", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch contacts assigned to current consultant
      const { data: contacts, error } = await supabase
        .from("contacts")
        .select(`
          *,
          customer_journey_steps(id, completed)
        `)
        .eq("consultant_id", user.id)
        .eq("status", "customer");

      if (error) throw error;

      // Calculate KPIs
      const totalClients = contacts?.length || 0;

      // Revenue: sum of subscription plans (assuming monthly values)
      const totalRevenue = contacts?.reduce((sum, contact) => {
        // Extract numeric value from subscription_plan string
        const planValue = contact.subscription_plan?.match(/\d+/)?.[0];
        return sum + (planValue ? parseFloat(planValue) : 0);
      }, 0) || 0;

      // At Risk: clients with no contact in >30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const atRiskCount = contacts?.filter((contact) => {
        if (!contact.last_contact_date) return true;
        return new Date(contact.last_contact_date) < thirtyDaysAgo;
      }).length || 0;

      // New Arrivals: clients with onboarding completed in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const newArrivalsCount = contacts?.filter((contact) => {
        const steps = contact.customer_journey_steps || [];
        const allCompleted = steps.length > 0 && steps.every((s: any) => s.completed);
        if (!allCompleted) return false;
        
        // Check if assigned recently (consultant_assigned_at would be better, using created_at as proxy)
        return contact.created_at && new Date(contact.created_at) > sevenDaysAgo;
      }).length || 0;

      return {
        totalClients,
        totalRevenue,
        atRiskCount,
        newArrivalsCount,
      } as PortfolioKPIs;
    },
    enabled: !!user?.id,
  });
}
