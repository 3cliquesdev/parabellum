import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useNextActivity(dealId?: string) {
  return useQuery({
    queryKey: ["next-activity", dealId],
    queryFn: async () => {
      if (!dealId) return null;

      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("deal_id", dealId)
        .eq("completed", false)
        .order("due_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!dealId,
  });
}
