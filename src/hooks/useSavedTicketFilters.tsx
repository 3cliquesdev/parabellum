import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { TicketFilters } from "@/components/support/TicketFilterPopover";
import { Json } from "@/integrations/supabase/types";

export interface SavedTicketFilter {
  id: string;
  user_id: string;
  name: string;
  filters: TicketFilters;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

function parseFilters(json: Json): TicketFilters {
  const data = json as Record<string, unknown>;
  return {
    search: (data?.search as string) || "",
    searchInHistory: (data?.searchInHistory as boolean) || false,
    status: (data?.status as string[]) || [],
    priority: (data?.priority as string[]) || [],
    category: (data?.category as string[]) || [],
    channel: (data?.channel as string[]) || [],
    tags: (data?.tags as string[]) || [],
    dateRange: data?.dateRange as { from: Date; to?: Date } | undefined,
    slaExpired: (data?.slaExpired as boolean) || false,
    noTags: (data?.noTags as boolean) || false,
    departmentId: data?.departmentId as string | undefined,
    assignedTo: data?.assignedTo as string | undefined,
  };
}

export function useSavedTicketFilters() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["saved-ticket-filters", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("saved_ticket_filters")
        .select("*")
        .eq("user_id", user.id)
        .order("is_pinned", { ascending: false })
        .order("name", { ascending: true });

      if (error) throw error;

      return (data || []).map((filter) => ({
        ...filter,
        filters: parseFilters(filter.filters),
      })) as SavedTicketFilter[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateSavedTicketFilter() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, filters }: { name: string; filters: TicketFilters }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("saved_ticket_filters")
        .insert({
          user_id: user.id,
          name,
          filters: filters as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-ticket-filters"] });
      toast.success("Filtro salvo com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao salvar filtro:", error);
      toast.error("Erro ao salvar filtro");
    },
  });
}

export function useDeleteSavedTicketFilter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (filterId: string) => {
      const { error } = await supabase
        .from("saved_ticket_filters")
        .delete()
        .eq("id", filterId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-ticket-filters"] });
      toast.success("Filtro excluído!");
    },
    onError: (error) => {
      console.error("Erro ao excluir filtro:", error);
      toast.error("Erro ao excluir filtro");
    },
  });
}

export function useUpdateSavedTicketFilter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, filters, is_pinned }: { 
      id: string; 
      name?: string; 
      filters?: TicketFilters;
      is_pinned?: boolean;
    }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (filters !== undefined) updates.filters = filters;
      if (is_pinned !== undefined) updates.is_pinned = is_pinned;

      const { error } = await supabase
        .from("saved_ticket_filters")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-ticket-filters"] });
      toast.success("Filtro atualizado!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar filtro:", error);
      toast.error("Erro ao atualizar filtro");
    },
  });
}
