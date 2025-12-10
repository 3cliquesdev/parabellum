import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TriggerType = 'on_submit' | 'on_field_change' | 'on_score_threshold' | 'on_condition_match';
export type ActionType = 'start_playbook' | 'send_email' | 'create_deal' | 'create_ticket' | 'add_tag' | 'webhook' | 'update_contact';

export interface TriggerConfig {
  field_id?: string;
  score_field?: string;
  score_operator?: 'greater_than' | 'less_than' | 'equals';
  score_value?: number;
  condition_field?: string;
  condition_operator?: string;
  condition_value?: any;
}

export interface ActionConfig {
  // Playbook
  playbook_id?: string;
  
  // Email
  template_id?: string;
  
  // Deal
  pipeline_id?: string;
  stage_id?: string;
  deal_title_template?: string;
  deal_value_field?: string;
  
  // Ticket
  ticket_title_template?: string;
  ticket_priority?: string;
  ticket_category?: string;
  ticket_department_id?: string;
  
  // Tag
  tag_id?: string;
  
  // Webhook
  webhook_url?: string;
  webhook_method?: 'POST' | 'PUT' | 'PATCH';
  webhook_headers?: Record<string, string>;
  
  // Update Contact
  contact_field?: string;
  contact_value_template?: string;
}

export interface FormAutomation {
  id: string;
  form_id: string;
  name: string;
  trigger_type: TriggerType;
  trigger_config: TriggerConfig | null;
  action_type: ActionType;
  action_config: ActionConfig;
  is_active: boolean;
  priority: number;
  created_at: string;
}

export function useFormAutomations(formId: string | undefined) {
  return useQuery({
    queryKey: ['form-automations', formId],
    queryFn: async () => {
      if (!formId) return [];
      
      const { data, error } = await supabase
        .from('form_automations')
        .select('*')
        .eq('form_id', formId)
        .order('priority', { ascending: true });
      
      if (error) throw error;
      return (data || []) as FormAutomation[];
    },
    enabled: !!formId,
  });
}

export function useCreateFormAutomation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (automation: Omit<FormAutomation, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('form_automations')
        .insert({
          form_id: automation.form_id,
          name: automation.name,
          trigger_type: automation.trigger_type,
          trigger_config: automation.trigger_config as any,
          action_type: automation.action_type,
          action_config: automation.action_config as any,
          is_active: automation.is_active,
          priority: automation.priority,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['form-automations', variables.form_id] });
      toast.success('Automação criada com sucesso');
    },
    onError: (error) => {
      console.error('Error creating automation:', error);
      toast.error('Erro ao criar automação');
    },
  });
}

export function useUpdateFormAutomation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, formId, ...updates }: Partial<FormAutomation> & { id: string; formId: string }) => {
      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.trigger_type) updateData.trigger_type = updates.trigger_type;
      if (updates.trigger_config) updateData.trigger_config = updates.trigger_config;
      if (updates.action_type) updateData.action_type = updates.action_type;
      if (updates.action_config) updateData.action_config = updates.action_config;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      
      const { data, error } = await supabase
        .from('form_automations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['form-automations', variables.formId] });
      toast.success('Automação atualizada');
    },
    onError: (error) => {
      console.error('Error updating automation:', error);
      toast.error('Erro ao atualizar automação');
    },
  });
}

export function useDeleteFormAutomation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, formId }: { id: string; formId: string }) => {
      const { error } = await supabase
        .from('form_automations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['form-automations', variables.formId] });
      toast.success('Automação removida');
    },
    onError: (error) => {
      console.error('Error deleting automation:', error);
      toast.error('Erro ao remover automação');
    },
  });
}

export function useToggleFormAutomation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, formId, isActive }: { id: string; formId: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('form_automations')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['form-automations', variables.formId] });
      toast.success(variables.isActive ? 'Automação ativada' : 'Automação desativada');
    },
    onError: (error) => {
      console.error('Error toggling automation:', error);
      toast.error('Erro ao alterar status da automação');
    },
  });
}

// Helper to get action type display name
export function getActionTypeLabel(actionType: ActionType): string {
  const labels: Record<ActionType, string> = {
    start_playbook: 'Iniciar Playbook',
    send_email: 'Enviar Email',
    create_deal: 'Criar Negócio',
    create_ticket: 'Criar Ticket',
    add_tag: 'Adicionar Tag',
    webhook: 'Webhook',
    update_contact: 'Atualizar Contato',
  };
  return labels[actionType] || actionType;
}

// Helper to get trigger type display name
export function getTriggerTypeLabel(triggerType: TriggerType): string {
  const labels: Record<TriggerType, string> = {
    on_submit: 'Ao Enviar Formulário',
    on_field_change: 'Ao Alterar Campo',
    on_score_threshold: 'Quando Score Atingir',
    on_condition_match: 'Quando Condição For Verdadeira',
  };
  return labels[triggerType] || triggerType;
}
