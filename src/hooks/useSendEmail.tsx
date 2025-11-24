import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SendEmailData {
  to: string;
  to_name: string;
  subject: string;
  html: string;
  customer_id: string;
}

export function useSendEmail() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: SendEmailData) => {
      const { data: result, error } = await supabase.functions.invoke('send-email', {
        body: data,
      });

      if (error) throw error;
      if (!result.success) throw new Error(result.error || 'Erro ao enviar email');

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customer-timeline", variables.customer_id] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({
        title: "✅ Email enviado",
        description: "Email enviado e interação registrada com sucesso.",
      });
    },
    onError: (error: Error) => {
      console.error('[useSendEmail] Error:', error);
      toast({
        title: "Erro ao enviar email",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}