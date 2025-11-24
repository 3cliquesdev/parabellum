import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type EmailTemplateInsert = Omit<Tables<"email_templates">, "id" | "created_at" | "updated_at" | "created_by">;

export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: EmailTemplateInsert) => {
      const { data: result, error } = await supabase
        .from("email_templates")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({
        title: "Template criado",
        description: "O template de email foi criado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar template",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
