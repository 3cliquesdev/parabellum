import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAIQueue } from "./useAIQueue";

interface Message {
  content: string;
  sender_type: 'user' | 'contact';
}

export function useAISummary() {
  const { toast } = useToast();
  const { enqueue } = useAIQueue();

  return useMutation({
    mutationFn: async (messages: Message[]) => {
      return enqueue(async () => {
        const { data, error } = await supabase.functions.invoke('analyze-ticket', {
          body: { mode: 'summary', messages }
        });

        if (error) {
          if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
            console.warn('[Summary] Rate limited, returning empty summary');
            return 'Resumo não disponível no momento. Tente novamente em alguns segundos.';
          }
          throw error;
        }
        return data.result as string;
      });
    },
    onSuccess: async (result) => {
      // Log AI usage
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('ai_usage_logs').insert({
          user_id: user.id,
          feature_type: 'summary',
          result_data: { summary_length: result.length }
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao gerar resumo AI",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
