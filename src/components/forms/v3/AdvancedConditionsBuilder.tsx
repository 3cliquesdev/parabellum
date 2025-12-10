import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GitBranch, ArrowRight, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FormField } from "@/hooks/useForms";
import { 
  useFormConditions, 
  useCreateFormCondition, 
  useUpdateFormCondition, 
  useDeleteFormCondition,
  buildConditionTree,
  type FormCondition 
} from "@/hooks/useFormConditions";

interface AdvancedConditionsBuilderProps {
  formId: string;
  fields: FormField[];
}

const OPERATORS = [
  { value: 'equals', label: 'É igual a' },
  { value: 'not_equals', label: 'Não é igual a' },
  { value: 'contains', label: 'Contém' },
  { value: 'not_contains', label: 'Não contém' },
  { value: 'greater_than', label: 'Maior que' },
  { value: 'less_than', label: 'Menor que' },
  { value: 'is_empty', label: 'Está vazio' },
  { value: 'is_not_empty', label: 'Não está vazio' },
  { value: 'in_list', label: 'Está na lista' },
];

const CONDITION_TYPES = [
  { value: 'show_field', label: 'Mostrar campo', icon: '👁️' },
  { value: 'hide_field', label: 'Esconder campo', icon: '🙈' },
  { value: 'require_field', label: 'Tornar obrigatório', icon: '⚠️' },
  { value: 'skip_field', label: 'Pular campo', icon: '⏭️' },
  { value: 'jump_to', label: 'Ir para campo', icon: '↗️' },
  { value: 'set_value', label: 'Definir valor', icon: '✏️' },
];

export default function AdvancedConditionsBuilder({ formId, fields }: AdvancedConditionsBuilderProps) {
  const [expandedConditions, setExpandedConditions] = useState<Set<string>>(new Set());
  
  const { data: conditions = [], isLoading } = useFormConditions(formId);
  const createCondition = useCreateFormCondition();
  const updateCondition = useUpdateFormCondition();
  const deleteCondition = useDeleteFormCondition();
  
  const conditionTree = buildConditionTree(conditions);
  
  const handleAddCondition = (parentId?: string) => {
    if (fields.length === 0) return;
    
    createCondition.mutate({
      form_id: formId,
      field_id: fields[0].id,
      parent_condition_id: parentId || null,
      condition_type: 'show_field',
      operator: 'equals',
      value: null,
      target_field_id: fields.length > 1 ? fields[1].id : fields[0].id,
      target_value: null,
      logic_group: 'AND',
      priority: conditions.length,
    });
  };
  
  const handleDeleteCondition = (id: string) => {
    deleteCondition.mutate({ id, formId });
  };
  
  const handleUpdateCondition = (id: string, updates: Partial<FormCondition>) => {
    updateCondition.mutate({ id, formId, ...updates });
  };
  
  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedConditions);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedConditions(newExpanded);
  };
  
  const renderConditionNode = (condition: FormCondition, depth: number = 0) => {
    const field = fields.find(f => f.id === condition.field_id);
    const targetField = fields.find(f => f.id === condition.target_field_id);
    const conditionType = CONDITION_TYPES.find(t => t.value === condition.condition_type);
    const hasChildren = condition.children && condition.children.length > 0;
    const isExpanded = expandedConditions.has(condition.id);
    
    return (
      <div key={condition.id} className={cn("relative", depth > 0 && "ml-8 border-l-2 border-dashed border-muted pl-4")}>
        <Card className={cn("mb-3 transition-all", depth > 0 && "bg-muted/30")}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Condition Icon */}
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                {conditionType?.icon || '❓'}
              </div>
              
              {/* Condition Configuration */}
              <div className="flex-1 space-y-3">
                {/* Logic Group Toggle (for nested conditions) */}
                {depth > 0 && (
                  <div className="flex items-center gap-2 mb-2">
                    <Badge 
                      variant={condition.logic_group === 'AND' ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => handleUpdateCondition(condition.id, { 
                        logic_group: condition.logic_group === 'AND' ? 'OR' : 'AND' 
                      })}
                    >
                      {condition.logic_group}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {condition.logic_group === 'AND' ? '(todas devem ser verdadeiras)' : '(qualquer uma verdadeira)'}
                    </span>
                  </div>
                )}
                
                {/* IF Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                  <div>
                    <Label className="text-xs text-muted-foreground">SE o campo</Label>
                    <Select
                      value={condition.field_id}
                      onValueChange={(value) => handleUpdateCondition(condition.id, { field_id: value })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {fields.map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Operador</Label>
                    <Select
                      value={condition.operator}
                      onValueChange={(value) => handleUpdateCondition(condition.id, { operator: value as any })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map(op => (
                          <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {!['is_empty', 'is_not_empty'].includes(condition.operator) && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Valor</Label>
                      {field?.type === 'select' && field.options ? (
                        <Select
                          value={condition.value || ''}
                          onValueChange={(value) => handleUpdateCondition(condition.id, { value })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          className="h-9"
                          value={condition.value || ''}
                          onChange={(e) => handleUpdateCondition(condition.id, { value: e.target.value })}
                          placeholder="Valor..."
                        />
                      )}
                    </div>
                  )}
                </div>
                
                {/* Arrow */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ArrowRight className="h-4 w-4" />
                  <span className="text-sm">ENTÃO</span>
                </div>
                
                {/* THEN Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                  <div>
                    <Label className="text-xs text-muted-foreground">Ação</Label>
                    <Select
                      value={condition.condition_type}
                      onValueChange={(value) => handleUpdateCondition(condition.id, { condition_type: value as any })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITION_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.icon} {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Campo Alvo</Label>
                    <Select
                      value={condition.target_field_id || ''}
                      onValueChange={(value) => handleUpdateCondition(condition.id, { target_field_id: value })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {fields.map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {condition.condition_type === 'set_value' && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Novo Valor</Label>
                      <Input
                        className="h-9"
                        value={condition.target_value || ''}
                        onChange={(e) => handleUpdateCondition(condition.id, { target_value: e.target.value })}
                        placeholder="Valor..."
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleAddCondition(condition.id)}
                  title="Adicionar condição aninhada"
                >
                  <Layers className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleDeleteCondition(condition.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Expand/Collapse for children */}
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => toggleExpand(condition.id)}
              >
                {isExpanded ? '▼' : '▶'} {condition.children?.length} condição(ões) aninhada(s)
              </Button>
            )}
          </CardContent>
        </Card>
        
        {/* Render children */}
        {hasChildren && isExpanded && (
          <div className="mt-2">
            {condition.children?.map(child => renderConditionNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };
  
  if (isLoading) {
    return <div className="text-center p-8 text-muted-foreground">Carregando condições...</div>;
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Condições Avançadas</h3>
          <Badge variant="secondary">{conditions.length}</Badge>
        </div>
        <Button onClick={() => handleAddCondition()} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Condição
        </Button>
      </div>
      
      {fields.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Adicione campos ao formulário para criar condições.
          </CardContent>
        </Card>
      ) : conditionTree.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Nenhuma condição configurada. Crie regras para mostrar/esconder campos com base nas respostas.
            </p>
            <Button onClick={() => handleAddCondition()} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Condição
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conditionTree.map(condition => renderConditionNode(condition))}
        </div>
      )}
    </div>
  );
}
