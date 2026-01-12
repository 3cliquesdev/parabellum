import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase as defaultClient } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

interface SendMessageOptions {
  client?: SupabaseClient;
}

export function useSendMessageOffline(options: SendMessageOptions = {}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const client = options.client ?? defaultClient;

  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      if (!navigator.onLine) {
        throw new Error("Você está offline. Conecte-se à internet para enviar mensagens.");
      }

      const { data, error } = await client
        .from('messages')
        .insert({ 
          conversation_id: conversationId, 
          content, 
          sender_type: 'contact' 
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar last_message_at
      await client
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

      // Invalidar queries para atualizar UI
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });

      return data;
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
