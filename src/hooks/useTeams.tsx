import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Team {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  manager_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  manager?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  members?: TeamMember[];
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  joined_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    job_title: string | null;
  };
}

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select(`
          *,
          manager:profiles!manager_id(id, full_name, avatar_url)
        `)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as Team[];
    },
  });
}

export function useTeamMembers(teamId?: string) {
  return useQuery({
    queryKey: ["team-members", teamId],
    queryFn: async () => {
      if (!teamId) return [];
      
      const { data, error } = await supabase
        .from("team_members")
        .select(`
          *,
          user:profiles!user_id(id, full_name, avatar_url, job_title)
        `)
        .eq("team_id", teamId);

      if (error) throw error;
      return data as TeamMember[];
    },
    enabled: !!teamId,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (team: { name: string; description?: string; color?: string; manager_id?: string }) => {
      const { data, error } = await supabase
        .from("teams")
        .insert(team)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast({ title: "Time criado", description: "O time foi criado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar time", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; color?: string; manager_id?: string | null }) => {
      const { data, error } = await supabase
        .from("teams")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast({ title: "Time atualizado", description: "O time foi atualizado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar time", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("teams")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast({ title: "Time removido", description: "O time foi desativado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover time", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateTeamMembers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ teamId, memberIds }: { teamId: string; memberIds: string[] }) => {
      // First, remove all current members
      const { error: deleteError } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId);

      if (deleteError) throw deleteError;

      // Then, add new members
      if (memberIds.length > 0) {
        const { error: insertError } = await supabase
          .from("team_members")
          .insert(memberIds.map(userId => ({ team_id: teamId, user_id: userId })));

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ["team-members", teamId] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast({ title: "Membros atualizados", description: "Os membros do time foram atualizados." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar membros", description: error.message, variant: "destructive" });
    },
  });
}

export function useUserTeams(userId?: string) {
  return useQuery({
    queryKey: ["user-teams", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("team_members")
        .select(`
          team_id,
          teams!team_id(id, name, color, manager_id)
        `)
        .eq("user_id", userId);

      if (error) throw error;
      return data.map(d => d.teams).filter(Boolean) as Team[];
    },
    enabled: !!userId,
  });
}
