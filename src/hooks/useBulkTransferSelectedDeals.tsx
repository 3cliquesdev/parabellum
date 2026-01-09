import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TransferSelectedParams {
  dealIds: string[];
  toUserId: string;
  keepHistory: boolean;
}

export function useBulkTransferSelectedDeals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dealIds, toUserId, keepHistory }: TransferSelectedParams) => {
      // Get target user name
      const { data: targetUser, error: userError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", toUserId)
        .single();

      if (userError) throw userError;

      // Update deals
      const { error: updateError } = await supabase
        .from("deals")
        .update({ assigned_to: toUserId })
        .in("id", dealIds);

      if (updateError) throw updateError;

      // Log history if enabled
      if (keepHistory) {
        // Get contact_ids from deals
        const { data: dealsData, error: dealsError } = await supabase
          .from("deals")
          .select("id, contact_id, title")
          .in("id", dealIds);

        if (!dealsError && dealsData) {
          const interactions = dealsData
            .filter(d => d.contact_id)
            .map(deal => ({
              customer_id: deal.contact_id!,
              type: "note" as const,
              content: `📋 Negócio "${deal.title}" transferido para ${targetUser?.full_name || "outro vendedor"}`,
              channel: "other" as const,
              metadata: {
                deal_id: deal.id,
                action: "bulk_transfer_to_seller",
                new_assigned_to: toUserId,
                transferred_at: new Date().toISOString(),
              },
            }));

          if (interactions.length > 0) {
            await supabase.from("interactions").insert(interactions);
          }
        }
      }

      return { count: dealIds.length, targetName: targetUser?.full_name };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast({
        title: "Negócios transferidos",
        description: `${data.count} negócio${data.count > 1 ? "s" : ""} transferido${data.count > 1 ? "s" : ""} para ${data.targetName}`,
      });
    },
    onError: (error) => {
      console.error("Error transferring deals:", error);
      toast({
        title: "Erro ao transferir negócios",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
