import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BulkMarkLostParams {
  dealIds: string[];
  lostReason: string;
  notes?: string;
  keepHistory: boolean;
}

export function useBulkMarkDealsAsLost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dealIds, lostReason, notes, keepHistory }: BulkMarkLostParams) => {
      console.log("📉 Bulk marking deals as lost:", { dealIds, lostReason, keepHistory });

      // 1. Update all deals in batch
      const { error: updateError } = await supabase
        .from("deals")
        .update({
          status: "lost",
          lost_reason: lostReason,
          closed_at: new Date().toISOString(),
        })
        .in("id", dealIds);

      if (updateError) {
        console.error("❌ Error updating deals:", updateError);
        throw updateError;
      }

      // 2. If keepHistory, log to contact timeline
      if (keepHistory) {
        // Fetch contact_ids for these deals
        const { data: deals, error: fetchError } = await supabase
          .from("deals")
          .select("id, title, contact_id, value")
          .in("id", dealIds);

        if (fetchError) {
          console.error("❌ Error fetching deals for history:", fetchError);
          // Don't throw - deals were already updated
        } else if (deals) {
          const interactions = deals
            .filter(deal => deal.contact_id)
            .map(deal => ({
              customer_id: deal.contact_id!,
              type: "note" as const,
              channel: "other" as const,
              content: `❌ Negócio "${deal.title}" marcado como perdido em massa.\nMotivo: ${lostReason}${notes ? `\nObservação: ${notes}` : ""}`,
              metadata: {
                deal_id: deal.id,
                bulk_action: true,
                lost_reason: lostReason,
                deal_value: deal.value,
              },
            }));

          if (interactions.length > 0) {
            const { error: interactionError } = await supabase
              .from("interactions")
              .insert(interactions);

            if (interactionError) {
              console.error("❌ Error logging interactions:", interactionError);
              // Don't throw - deals were already updated
            }
          }
        }
      }

      return { count: dealIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success(`${data.count} negócio(s) marcado(s) como perdido(s)`);
    },
    onError: (error: Error) => {
      console.error("❌ Bulk mark as lost failed:", error);
      toast.error("Erro ao marcar negócios como perdidos: " + error.message);
    },
  });
}
