import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useBulkArchiveTickets() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ticketIds: string[]) => {
      if (ticketIds.length === 0) {
        throw new Error("Nenhum ticket selecionado");
      }

      const { error } = await supabase
        .from("tickets")
        .update({ status: "closed" })
        .in("id", ticketIds);

      if (error) throw error;

      return ticketIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast({
        title: "Tickets arquivados",
        description: `${count} ticket${count > 1 ? "s" : ""} arquivado${count > 1 ? "s" : ""} com sucesso.`,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao arquivar tickets",
        description: error.message,
      });
    },
  });
}
