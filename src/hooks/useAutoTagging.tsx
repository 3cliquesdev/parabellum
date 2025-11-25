import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAIQueue } from "./useAIQueue";

export function useAutoTagging() {
  const { enqueue } = useAIQueue();

  return useMutation({
    mutationFn: async ({ description, subject }: { description: string; subject: string }) => {
      return enqueue(async () => {
        const { data, error } = await supabase.functions.invoke('analyze-ticket', {
          body: { 
            mode: 'tags', 
            description,
            ticketSubject: subject
          }
        });

        if (error) {
          if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
            console.warn('[AutoTag] Rate limited, returning empty tags');
            return [];
          }
          throw error;
        }
        
        // Parse comma-separated tags
        const tags = data.result.split(',').map((tag: string) => tag.trim());
        return tags as string[];
      });
    },
    onSuccess: async (tags) => {
      // Log AI usage
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('ai_usage_logs').insert({
          user_id: user.id,
          feature_type: 'tags',
          result_data: { tags, tags_count: tags.length }
        });
      }
    },
  });
}
