import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ScheduledReport {
  id: string;
  user_id: string;
  report_type: string;
  report_name: string;
  filters: any;
  format: 'csv' | 'pdf';
  frequency: 'daily' | 'weekly' | 'monthly';
  day_of_week?: number;
  day_of_month?: number;
  hour: number;
  email: string;
  is_active: boolean;
  last_sent_at?: string;
  created_at: string;
  updated_at: string;
}

export function useScheduledReports() {
  return useQuery({
    queryKey: ['scheduled-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ScheduledReport[];
    },
  });
}

export function useCreateScheduledReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (report: Partial<ScheduledReport>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('scheduled_reports')
        .insert([{
          user_id: user.id,
          report_type: report.report_type!,
          report_name: report.report_name!,
          filters: report.filters || {},
          format: report.format || 'csv',
          frequency: report.frequency!,
          day_of_week: report.day_of_week,
          day_of_month: report.day_of_month,
          hour: report.hour || 8,
          email: user.email!,
          is_active: report.is_active !== undefined ? report.is_active : true,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      toast.success('Relatório agendado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao agendar relatório', {
        description: error.message,
      });
    },
  });
}

export function useUpdateScheduledReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScheduledReport> & { id: string }) => {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      toast.success('Relatório atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar relatório', {
        description: error.message,
      });
    },
  });
}

export function useDeleteScheduledReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduled_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      toast.success('Relatório removido com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover relatório', {
        description: error.message,
      });
    },
  });
}
