import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useLTVStats() {
  return useQuery({
    queryKey: ["ltv-stats"],
    queryFn: async () => {
      const { data: contacts, error } = await supabase
        .from("contacts")
        .select("total_ltv, status")
        .gt("total_ltv", 0);

      if (error) throw error;

      const totalCustomers = contacts.length;
      const avgLTV = totalCustomers > 0 
        ? contacts.reduce((sum, c) => sum + (c.total_ltv || 0), 0) / totalCustomers 
        : 0;
      const totalLTV = contacts.reduce((sum, c) => sum + (c.total_ltv || 0), 0);
      
      const ltvByStatus = {
        customer: contacts
          .filter(c => c.status === 'customer')
          .reduce((sum, c) => sum + (c.total_ltv || 0), 0),
        qualified: contacts
          .filter(c => c.status === 'qualified')
          .reduce((sum, c) => sum + (c.total_ltv || 0), 0),
        lead: contacts
          .filter(c => c.status === 'lead')
          .reduce((sum, c) => sum + (c.total_ltv || 0), 0),
      };

      return { avgLTV, totalLTV, totalCustomers, ltvByStatus };
    },
  });
}
