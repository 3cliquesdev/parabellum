import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ResendWelcomeEmailData {
  user_id: string;
}

export function useResendWelcomeEmail() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ResendWelcomeEmailData) => {
      console.log("[useResendWelcomeEmail] Reenviando email para:", data.user_id);

      const { data: result, error } = await supabase.functions.invoke('resend-welcome-email', {
        body: data,
      });

      if (error) {
        console.error("[useResendWelcomeEmail] Edge Function error:", error);
        throw new Error(error.message || "Erro ao reenviar email");
      }

      if (!result?.success) {
        throw new Error(result?.error || "Falha ao reenviar email");
      }

      console.log("[useResendWelcomeEmail] Email reenviado com sucesso");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "📧 Email reenviado!",
        description: "O email de boas-vindas foi reenviado com nova senha temporária.",
      });
    },
    onError: (error: Error) => {
      console.error("[useResendWelcomeEmail] Error:", error);
      toast({
        variant: "destructive",
        title: "Erro ao reenviar email",
        description: error.message,
      });
    },
  });
}
