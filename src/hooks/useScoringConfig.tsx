import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ScoringRule {
  value?: string;
  min?: number;
  max?: number;
  points: number;
  label: string;
}

export interface ScoringConfig {
  id: string;
  field_name: string;
  field_label: string;
  value_rules: ScoringRule[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScoringRange {
  id: string;
  classification: string;
  min_score: number;
  max_score: number | null;
  color: string;
  priority: number;
  created_at: string;
}

export function useScoringConfig() {
  return useQuery({
    queryKey: ["scoring-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scoring_config")
        .select("*")
        .order("field_name");
      
      if (error) throw error;
      
      return data.map(item => ({
        ...item,
        value_rules: (item.value_rules as unknown) as ScoringRule[]
      })) as ScoringConfig[];
    },
  });
}

export function useScoringRanges() {
  return useQuery({
    queryKey: ["scoring-ranges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scoring_ranges")
        .select("*")
        .order("min_score");
      
      if (error) throw error;
      return data as ScoringRange[];
    },
  });
}

export function useUpdateScoringConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: { value_rules?: ScoringRule[]; is_active?: boolean } 
    }) => {
      const { data, error } = await supabase
        .from("scoring_config")
        .update({
          ...updates,
          value_rules: updates.value_rules as unknown as any,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scoring-config"] });
      toast({
        title: "Configuração atualizada",
        description: "As regras de pontuação foram salvas.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateScoringRange() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<Pick<ScoringRange, 'min_score' | 'max_score' | 'color'>> 
    }) => {
      const { data, error } = await supabase
        .from("scoring_ranges")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scoring-ranges"] });
      toast({
        title: "Faixas atualizadas",
        description: "As faixas de classificação foram salvas.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Recalcular score para todos os leads existentes
export function useRecalculateScores() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      // Buscar todas as submissions
      const { data: submissions, error: fetchError } = await supabase
        .from("onboarding_submissions")
        .select("id");

      if (fetchError) throw fetchError;

      // Chamar a função de cálculo para cada submission
      for (const submission of submissions || []) {
        await supabase.rpc("calculate_lead_score", { 
          submission_id: submission.id 
        });
      }

      return submissions?.length || 0;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-submissions"] });
      toast({
        title: "Scores recalculados",
        description: `${count} leads foram recalculados.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao recalcular",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
