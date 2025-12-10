import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { evaluateFormula, validateFormulaSyntax, extractFieldReferences } from "@/lib/formula-parser";

export interface FormCalculation {
  id: string;
  form_id: string;
  name: string;
  formula: string;
  result_type: 'number' | 'text' | 'boolean';
  display_in_results: boolean;
  created_at: string;
}

export function useFormCalculations(formId: string | undefined) {
  return useQuery({
    queryKey: ['form-calculations', formId],
    queryFn: async () => {
      if (!formId) return [];
      
      const { data, error } = await supabase
        .from('form_calculations')
        .select('*')
        .eq('form_id', formId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []) as FormCalculation[];
    },
    enabled: !!formId,
  });
}

export function useCreateFormCalculation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (calculation: Omit<FormCalculation, 'id' | 'created_at'>) => {
      // Validate formula syntax before saving
      const validation = validateFormulaSyntax(calculation.formula);
      if (!validation.valid) {
        throw new Error(validation.error || 'Fórmula inválida');
      }
      
      const { data, error } = await supabase
        .from('form_calculations')
        .insert(calculation)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['form-calculations', variables.form_id] });
      toast.success('Cálculo criado com sucesso');
    },
    onError: (error) => {
      console.error('Error creating calculation:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar cálculo');
    },
  });
}

export function useUpdateFormCalculation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, formId, ...updates }: Partial<FormCalculation> & { id: string; formId: string }) => {
      // Validate formula syntax if formula is being updated
      if (updates.formula) {
        const validation = validateFormulaSyntax(updates.formula);
        if (!validation.valid) {
          throw new Error(validation.error || 'Fórmula inválida');
        }
      }
      
      const { data, error } = await supabase
        .from('form_calculations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['form-calculations', variables.formId] });
      toast.success('Cálculo atualizado');
    },
    onError: (error) => {
      console.error('Error updating calculation:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar cálculo');
    },
  });
}

export function useDeleteFormCalculation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, formId }: { id: string; formId: string }) => {
      const { error } = await supabase
        .from('form_calculations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['form-calculations', variables.formId] });
      toast.success('Cálculo removido');
    },
    onError: (error) => {
      console.error('Error deleting calculation:', error);
      toast.error('Erro ao remover cálculo');
    },
  });
}

// Execute all calculations for a form submission
export function executeCalculations(
  calculations: FormCalculation[],
  fieldValues: Record<string, any>
): Record<string, { value: any; error?: string }> {
  const results: Record<string, { value: any; error?: string }> = {};
  
  calculations.forEach(calc => {
    const result = evaluateFormula(calc.formula, fieldValues);
    results[calc.name] = {
      value: result.success ? result.value : null,
      error: result.error,
    };
  });
  
  return results;
}

// Get list of fields used in a calculation
export function getCalculationDependencies(formula: string): string[] {
  return extractFieldReferences(formula);
}

// Validate that all field references exist in form
export function validateCalculationFields(
  formula: string,
  availableFields: string[]
): { valid: boolean; missingFields: string[] } {
  const references = extractFieldReferences(formula);
  const missingFields = references.filter(ref => !availableFields.includes(ref));
  
  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}
