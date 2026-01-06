import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BulkMoveParams {
  dealIds: string[];
  targetPipelineId: string;
  targetStageId: string;
  targetPipelineName: string;
  targetStageName: string;
  assignedTo?: string | null;
  keepHistory?: boolean;
}

export function useBulkMoveDealsToPipeline() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: BulkMoveParams) => {
      const { 
        dealIds, 
        targetPipelineId, 
        targetStageId, 
        targetPipelineName, 
        targetStageName,
        assignedTo,
        keepHistory = true 
      } = params;

      // 1. Update all deals
      const updateData: Record<string, any> = {
        pipeline_id: targetPipelineId,
        stage_id: targetStageId,
        updated_at: new Date().toISOString(),
      };

      // Only update assigned_to if explicitly provided
      if (assignedTo !== undefined) {
        updateData.assigned_to = assignedTo;
      }

      const { error: updateError } = await supabase
        .from("deals")
        .update(updateData)
        .in("id", dealIds);

      if (updateError) throw updateError;

      // 2. Log audit trail if keepHistory is enabled
      if (keepHistory) {
        // Get deals with contact_id for timeline logging
        const { data: deals } = await supabase
          .from("deals")
          .select("id, contact_id, title")
          .in("id", dealIds);

        const interactionsToInsert = (deals || [])
          .filter(d => d.contact_id)
          .map(deal => ({
            customer_id: deal.contact_id,
            type: 'note' as const,
            content: `📦 Migrado em massa para ${targetPipelineName} > ${targetStageName}`,
            channel: 'other' as const,
            metadata: {
              deal_id: deal.id,
              deal_title: deal.title,
              bulk_migration: true,
              target_pipeline: targetPipelineName,
              target_stage: targetStageName,
              migrated_at: new Date().toISOString(),
            },
          }));

        if (interactionsToInsert.length > 0) {
          await supabase.from("interactions").insert(interactionsToInsert);
        }
      }

      return { count: dealIds.length };
    },
    onSuccess: (result, params) => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast({
        title: "Migração em massa concluída",
        description: `${result.count} negócios movidos para ${params.targetPipelineName} > ${params.targetStageName}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na migração",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
