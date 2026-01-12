import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase as defaultClient } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

interface UseMessagesOptions {
  client?: SupabaseClient;
}

export function useMessagesOffline(
  conversationId: string | null, 
  options: UseMessagesOptions = {}
) {
  const queryClient = useQueryClient();
  const client = options.client ?? defaultClient;

  const { data: messages, error, isLoading } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await client
        .from("messages")
        .select(`
          *,
          sender:profiles!sender_id(id, full_name, avatar_url, job_title)
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error('[useMessagesOffline] Erro ao buscar mensagens:', error);
        throw error;
      }
      return data ?? [];
    },
    enabled: !!conversationId,
    staleTime: 5000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Realtime subscription usando o client correto
  useEffect(() => {
    if (!conversationId) return;

    const channel = client
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [conversationId, queryClient, client]);

  // Revalidar ao voltar online
  useEffect(() => {
    const handleOnline = () => {
      console.log('[useMessagesOffline] Voltou online - revalidando mensagens');
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    };
    
    const handleFocus = () => {
      if (navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleFocus);
    };
  }, [conversationId, queryClient]);

  return {
    messages: messages ?? [],
    isOffline: !navigator.onLine,
    hasError: !!error,
    isLoading
  };
}

// Função mantida para compatibilidade, mas retorna sempre vazio (sem mais fila local)
export function usePendingMessages(_conversationId: string | null) {
  return [];
}
