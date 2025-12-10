import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FormCondition {
  id: string;
  form_id: string;
  field_id: string;
  parent_condition_id: string | null;
  condition_type: 'show_field' | 'hide_field' | 'jump_to' | 'set_value' | 'require_field' | 'skip_field';
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty' | 'matches_regex' | 'in_list';
  value: any;
  target_field_id: string | null;
  target_value: any;
  logic_group: 'AND' | 'OR';
  priority: number;
  created_at: string;
  children?: FormCondition[];
}

export function useFormConditions(formId: string | undefined) {
  return useQuery({
    queryKey: ['form-conditions', formId],
    queryFn: async () => {
      if (!formId) return [];
      
      const { data, error } = await supabase
        .from('form_conditions')
        .select('*')
        .eq('form_id', formId)
        .order('priority', { ascending: true });
      
      if (error) throw error;
      return (data || []) as FormCondition[];
    },
    enabled: !!formId,
  });
}

export function useCreateFormCondition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (condition: Omit<FormCondition, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('form_conditions')
        .insert(condition)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['form-conditions', variables.form_id] });
      toast.success('Condição criada com sucesso');
    },
    onError: (error) => {
      console.error('Error creating condition:', error);
      toast.error('Erro ao criar condição');
    },
  });
}

export function useUpdateFormCondition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, formId, ...updates }: Partial<FormCondition> & { id: string; formId: string }) => {
      const { data, error } = await supabase
        .from('form_conditions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['form-conditions', variables.formId] });
      toast.success('Condição atualizada');
    },
    onError: (error) => {
      console.error('Error updating condition:', error);
      toast.error('Erro ao atualizar condição');
    },
  });
}

export function useDeleteFormCondition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, formId }: { id: string; formId: string }) => {
      const { error } = await supabase
        .from('form_conditions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['form-conditions', variables.formId] });
      toast.success('Condição removida');
    },
    onError: (error) => {
      console.error('Error deleting condition:', error);
      toast.error('Erro ao remover condição');
    },
  });
}

// Build hierarchical condition tree
export function buildConditionTree(conditions: FormCondition[]): FormCondition[] {
  const conditionMap = new Map<string, FormCondition>();
  const rootConditions: FormCondition[] = [];
  
  // First pass: create map
  conditions.forEach(condition => {
    conditionMap.set(condition.id, { ...condition, children: [] });
  });
  
  // Second pass: build tree
  conditions.forEach(condition => {
    const node = conditionMap.get(condition.id)!;
    if (condition.parent_condition_id) {
      const parent = conditionMap.get(condition.parent_condition_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      }
    } else {
      rootConditions.push(node);
    }
  });
  
  return rootConditions;
}

// Evaluate conditions against form values
export function evaluateConditions(
  conditions: FormCondition[],
  fieldValues: Record<string, any>
): { visibleFields: Set<string>; hiddenFields: Set<string>; requiredFields: Set<string> } {
  const visibleFields = new Set<string>();
  const hiddenFields = new Set<string>();
  const requiredFields = new Set<string>();
  
  function evaluateCondition(condition: FormCondition): boolean {
    const fieldValue = fieldValues[condition.field_id];
    const compareValue = condition.value;
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === compareValue;
      case 'not_equals':
        return fieldValue !== compareValue;
      case 'contains':
        return String(fieldValue || '').toLowerCase().includes(String(compareValue || '').toLowerCase());
      case 'not_contains':
        return !String(fieldValue || '').toLowerCase().includes(String(compareValue || '').toLowerCase());
      case 'greater_than':
        return Number(fieldValue) > Number(compareValue);
      case 'less_than':
        return Number(fieldValue) < Number(compareValue);
      case 'is_empty':
        return !fieldValue || fieldValue === '';
      case 'is_not_empty':
        return !!fieldValue && fieldValue !== '';
      case 'matches_regex':
        try {
          return new RegExp(compareValue).test(String(fieldValue));
        } catch {
          return false;
        }
      case 'in_list':
        return Array.isArray(compareValue) && compareValue.includes(fieldValue);
      default:
        return false;
    }
  }
  
  function evaluateGroup(conditions: FormCondition[], logicGroup: 'AND' | 'OR'): boolean {
    if (conditions.length === 0) return true;
    
    if (logicGroup === 'AND') {
      return conditions.every(c => evaluateCondition(c));
    } else {
      return conditions.some(c => evaluateCondition(c));
    }
  }
  
  // Group conditions by target field and logic group
  const conditionsByTarget = new Map<string, FormCondition[]>();
  conditions.forEach(condition => {
    if (condition.target_field_id) {
      const key = condition.target_field_id;
      if (!conditionsByTarget.has(key)) {
        conditionsByTarget.set(key, []);
      }
      conditionsByTarget.get(key)!.push(condition);
    }
  });
  
  // Evaluate each target field's conditions
  conditionsByTarget.forEach((fieldConditions, targetFieldId) => {
    const result = evaluateGroup(fieldConditions, fieldConditions[0]?.logic_group || 'AND');
    
    fieldConditions.forEach(condition => {
      if (result) {
        switch (condition.condition_type) {
          case 'show_field':
            visibleFields.add(targetFieldId);
            break;
          case 'hide_field':
            hiddenFields.add(targetFieldId);
            break;
          case 'require_field':
            requiredFields.add(targetFieldId);
            break;
        }
      }
    });
  });
  
  return { visibleFields, hiddenFields, requiredFields };
}
