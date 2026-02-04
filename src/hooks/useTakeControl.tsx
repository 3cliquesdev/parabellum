import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface TakeControlParams {
  conversationId: string;
  contactId: string;
}

/**
 * Hook para assumir controle de conversa (Autopilot → Copilot)
 * Usa RPC SECURITY DEFINER para bypassar RLS com validação
 * 
 * VALIDAÇÃO NA RPC:
 * - Managers/Admins podem assumir qualquer conversa sem estar online
 * - Agentes precisam estar online
 * - Conversas não atribuídas podem ser assumidas por qualquer agente
 */
export function useTakeControl() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ conversationId, contactId, onSuccessCallback }: TakeControlParams & { onSuccessCallback?: () => void }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      console.log('[useTakeControl] Assumindo controle via RPC:', conversationId);

      // Chamar RPC SECURITY DEFINER - bypassa RLS com validação
      const { data: result, error } = await supabase
        .rpc('take_control_secure', {
          p_conversation_id: conversationId
        });

      if (error) {
        console.error('[useTakeControl] RPC error:', error);
        throw error;
      }

      // Cast result para tipo esperado
      const takeControlResult = result as { success: boolean; error?: string; conversation_id?: string; assigned_to?: string; ai_mode?: string } | null;

      if (!takeControlResult?.success) {
        console.error('[useTakeControl] Take control failed:', takeControlResult?.error);
        throw new Error(takeControlResult?.error || 'Erro ao assumir conversa');
      }

      console.log('[useTakeControl] ✅ Conversa assumida com sucesso:', takeControlResult);

      // Registrar interação de tomada de controle
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const { error: interactionError } = await supabase
        .from('interactions')
        .insert({
          customer_id: contactId,
          type: 'note',
          content: `👤 **Controle Assumido**\n\n${profile?.full_name || 'Atendente'} assumiu o controle da conversa. Modo mudado de Autopilot para Copilot (IA assistente).`,
          channel: 'other',
          metadata: {
            take_control: true,
            conversation_id: conversationId,
            user_id: user.id,
            timestamp: new Date().toISOString()
          }
        });

      if (interactionError) {
        console.error('[useTakeControl] Erro ao registrar interação:', interactionError);
      }

      // Chamar auto-handoff para gerar resumo (opcional)
      try {
        const { data: messages } = await supabase
          .from('messages')
          .select('content, sender_type, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (messages && messages.length > 0) {
          const lastMessages = messages.reverse().map(m => ({
            content: m.content,
            sender_type: m.sender_type as 'user' | 'contact' | 'system',
            created_at: m.created_at
          }));

          await supabase.functions.invoke('auto-handoff', {
            body: { conversationId, lastMessages }
          });
        }
      } catch (handoffError) {
        console.warn('[useTakeControl] Auto-handoff opcional falhou:', handoffError);
      }

      return { conversationId, onSuccessCallback };
    },
    onMutate: async ({ conversationId }) => {
      // 🚀 OPTIMISTIC UPDATE: Atualiza o cache ANTES da mutation completar
      await queryClient.cancelQueries({ queryKey: ["ai-mode", conversationId] });
      await queryClient.cancelQueries({ queryKey: ["conversations"] });
      
      const previousAIMode = queryClient.getQueryData(["ai-mode", conversationId]);
      const previousConversations = queryClient.getQueryData(["conversations"]);
      
      queryClient.setQueryData(["ai-mode", conversationId], 'copilot');
      
      queryClient.setQueriesData({ queryKey: ["conversations"] }, (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((conv: any) => 
            conv.id === conversationId 
              ? { ...conv, ai_mode: 'copilot', assigned_to: user?.id }
              : conv
          );
        }
        if (old.id === conversationId) {
          return { ...old, ai_mode: 'copilot', assigned_to: user?.id };
        }
        return old;
      });
      
      return { previousAIMode, previousConversations, conversationId };
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousAIMode !== undefined) {
        queryClient.setQueryData(["ai-mode", context.conversationId], context.previousAIMode);
      }
      if (context?.previousConversations !== undefined) {
        queryClient.setQueryData(["conversations"], context.previousConversations);
      }
      
      console.error('[useTakeControl] Erro:', error);
      toast({
        title: "Erro ao assumir controle",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: ({ conversationId, onSuccessCallback }) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["ai-mode", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["customer-timeline"] });
      
      toast({
        title: "✋ Controle Assumido",
        description: "Você agora está no modo Copilot. A IA irá sugerir respostas para você.",
      });
      
      if (onSuccessCallback) {
        onSuccessCallback();
      }
    },
  });
}

// Hook useCanTakeControl foi movido para src/hooks/useCanTakeControl.tsx
