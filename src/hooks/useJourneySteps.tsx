import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useJourneySteps(contactId: string) {
  return useQuery({
    queryKey: ["journey-steps", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_journey_steps")
        .select("*")
        .eq("contact_id", contactId)
        .order("position", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!contactId,
  });
}
