import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TicketOperation {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
}

export function useTicketOperations() {
  return useQuery({
    queryKey: ["ticket-operations"],
    queryFn: async (): Promise<TicketOperation[]> => {
      const { data, error } = await supabase
        .from("ticket_operations" as any)
        .select("*")
        .order("name");

      if (error) throw error;
      return (data as any) || [];
    },
  });
}

export function useCreateTicketOperation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (op: { name: string; description?: string; color?: string }) => {
      const { data, error } = await supabase
        .from("ticket_operations" as any)
        .insert(op)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-operations"] });
      toast({ title: "Operação criada", description: "A nova operação foi adicionada." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar operação", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateTicketOperation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...params }: { id: string; name?: string; description?: string; color?: string; is_active?: boolean }) => {
      const { data, error } = await supabase
        .from("ticket_operations" as any)
        .update(params)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-operations"] });
      toast({ title: "Operação atualizada", description: "As alterações foram salvas." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar operação", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteTicketOperation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ticket_operations" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-operations"] });
      toast({ title: "Operação deletada", description: "A operação foi removida." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao deletar operação", description: error.message, variant: "destructive" });
    },
  });
}
