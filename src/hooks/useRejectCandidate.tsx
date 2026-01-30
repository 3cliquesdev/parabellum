import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RejectParams {
  candidateId: string;
  reason: string;
}

export function useRejectCandidate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ candidateId, reason }: RejectParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('knowledge_candidates')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', candidateId);

      if (error) {
        console.error('Error rejecting candidate:', error);
        throw new Error('Erro ao rejeitar candidato');
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-candidates-stats'] });
      toast({
        title: "Candidato rejeitado",
        description: "O conhecimento foi descartado.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao rejeitar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
