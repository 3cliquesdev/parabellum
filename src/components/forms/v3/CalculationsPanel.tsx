import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Calculator, CheckCircle2, XCircle, Play } from "lucide-react";
import type { FormField } from "@/hooks/useForms";
import { 
  useFormCalculations, 
  useCreateFormCalculation, 
  useUpdateFormCalculation, 
  useDeleteFormCalculation,
  type FormCalculation 
} from "@/hooks/useFormCalculations";
import { evaluateFormula, validateFormulaSyntax, extractFieldReferences } from "@/lib/formula-parser";

interface CalculationsPanelProps {
  formId: string;
  fields: FormField[];
}

export default function CalculationsPanel({ formId, fields }: CalculationsPanelProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCalc, setEditingCalc] = useState<FormCalculation | null>(null);
  const [testValues, setTestValues] = useState<Record<string, number>>({});
  const [testResult, setTestResult] = useState<{ value: any; error?: string } | null>(null);
  
  const [newCalc, setNewCalc] = useState({
    name: '',
    formula: '',
    result_type: 'number' as 'number' | 'text' | 'boolean',
    display_in_results: true,
  });
  
  const { data: calculations = [], isLoading } = useFormCalculations(formId);
  const createCalculation = useCreateFormCalculation();
  const updateCalculation = useUpdateFormCalculation();
  const deleteCalculation = useDeleteFormCalculation();
  
  const handleCreate = () => {
    if (!newCalc.name || !newCalc.formula) return;
    
    createCalculation.mutate({
      form_id: formId,
      ...newCalc,
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setNewCalc({ name: '', formula: '', result_type: 'number', display_in_results: true });
      }
    });
  };
  
  const handleUpdate = () => {
    if (!editingCalc) return;
    
    updateCalculation.mutate({
      id: editingCalc.id,
      formId,
      name: editingCalc.name,
      formula: editingCalc.formula,
      result_type: editingCalc.result_type,
      display_in_results: editingCalc.display_in_results,
    }, {
      onSuccess: () => setEditingCalc(null)
    });
  };
  
  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cálculo?')) {
      deleteCalculation.mutate({ id, formId });
    }
  };
  
  const testFormula = (formula: string) => {
    const context: Record<string, any> = {};
    const refs = extractFieldReferences(formula);
    refs.forEach(ref => {
      context[ref] = testValues[ref] || 0;
    });
    
    const result = evaluateFormula(formula, context);
    setTestResult({
      value: result.success ? result.value : null,
      error: result.error,
    });
  };
  
  const insertFieldReference = (fieldId: string, target: 'new' | 'edit') => {
    const ref = `{${fieldId}}`;
    if (target === 'new') {
      setNewCalc(prev => ({ ...prev, formula: prev.formula + ref }));
    } else if (editingCalc) {
      setEditingCalc(prev => prev ? { ...prev, formula: prev.formula + ref } : null);
    }
  };
  
  const getFormulaValidation = (formula: string) => {
    if (!formula) return null;
    return validateFormulaSyntax(formula);
  };
  
  const renderFormulaEditor = (
    formula: string, 
    onChange: (formula: string) => void,
    target: 'new' | 'edit'
  ) => {
    const validation = getFormulaValidation(formula);
    const refs = extractFieldReferences(formula);
    
    return (
      <div className="space-y-3">
        <div>
          <Label>Fórmula</Label>
          <Textarea
            value={formula}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Ex: {campo_quantidade} * {campo_preco} * 1.1"
            className="font-mono text-sm"
            rows={3}
          />
          {validation && (
            <div className={`flex items-center gap-2 mt-1 text-sm ${validation.valid ? 'text-green-600' : 'text-destructive'}`}>
              {validation.valid ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {validation.valid ? 'Sintaxe válida' : validation.error}
            </div>
          )}
        </div>
        
        <div>
          <Label className="text-xs text-muted-foreground">Inserir Campo</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {fields.map(field => (
              <Badge
                key={field.id}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => insertFieldReference(field.id, target)}
              >
                + {field.label}
              </Badge>
            ))}
          </div>
        </div>
        
        {refs.length > 0 && (
          <div>
            <Label className="text-xs text-muted-foreground">Campos Utilizados</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {refs.map(ref => {
                const field = fields.find(f => f.id === ref);
                return (
                  <Badge key={ref} variant="secondary">
                    {field?.label || ref}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Test Section */}
        <div className="border-t pt-3">
          <Label className="text-xs text-muted-foreground">Testar Fórmula</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {refs.map(ref => {
              const field = fields.find(f => f.id === ref);
              return (
                <div key={ref}>
                  <Label className="text-xs">{field?.label || ref}</Label>
                  <Input
                    type="number"
                    value={testValues[ref] || 0}
                    onChange={(e) => setTestValues(prev => ({ 
                      ...prev, 
                      [ref]: parseFloat(e.target.value) || 0 
                    }))}
                    className="h-8"
                  />
                </div>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 gap-2"
            onClick={() => testFormula(formula)}
            disabled={!validation?.valid}
          >
            <Play className="h-4 w-4" />
            Testar
          </Button>
          {testResult && (
            <div className={`mt-2 p-2 rounded text-sm ${testResult.error ? 'bg-destructive/10 text-destructive' : 'bg-green-50 text-green-700'}`}>
              {testResult.error || `Resultado: ${testResult.value}`}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  if (isLoading) {
    return <div className="text-center p-8 text-muted-foreground">Carregando cálculos...</div>;
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Cálculos e Scores</h3>
          <Badge variant="secondary">{calculations.length}</Badge>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Cálculo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Novo Cálculo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Cálculo</Label>
                  <Input
                    value={newCalc.name}
                    onChange={(e) => setNewCalc(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: score_qualificacao"
                  />
                </div>
                <div>
                  <Label>Tipo de Resultado</Label>
                  <Select
                    value={newCalc.result_type}
                    onValueChange={(value: any) => setNewCalc(prev => ({ ...prev, result_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="number">Número</SelectItem>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="boolean">Sim/Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {renderFormulaEditor(newCalc.formula, (formula) => setNewCalc(prev => ({ ...prev, formula })), 'new')}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newCalc.display_in_results}
                    onCheckedChange={(checked) => setNewCalc(prev => ({ ...prev, display_in_results: checked }))}
                  />
                  <Label>Exibir nos resultados</Label>
                </div>
                <Button onClick={handleCreate} disabled={!newCalc.name || !newCalc.formula || createCalculation.isPending}>
                  Criar Cálculo
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {calculations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Nenhum cálculo configurado. Crie fórmulas para calcular scores, orçamentos e mais.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Cálculo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {calculations.map(calc => (
            <Card key={calc.id}>
              <CardContent className="p-4">
                {editingCalc?.id === calc.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Nome</Label>
                        <Input
                          value={editingCalc.name}
                          onChange={(e) => setEditingCalc(prev => prev ? { ...prev, name: e.target.value } : null)}
                        />
                      </div>
                      <div>
                        <Label>Tipo</Label>
                        <Select
                          value={editingCalc.result_type}
                          onValueChange={(value: any) => setEditingCalc(prev => prev ? { ...prev, result_type: value } : null)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="number">Número</SelectItem>
                            <SelectItem value="text">Texto</SelectItem>
                            <SelectItem value="boolean">Sim/Não</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {renderFormulaEditor(editingCalc.formula, (formula) => setEditingCalc(prev => prev ? { ...prev, formula } : null), 'edit')}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setEditingCalc(null)}>Cancelar</Button>
                      <Button onClick={handleUpdate}>Salvar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{calc.name}</span>
                        <Badge variant="outline">{calc.result_type}</Badge>
                        {calc.display_in_results && <Badge variant="secondary">Exibido</Badge>}
                      </div>
                      <code className="text-sm text-muted-foreground mt-1 block">{calc.formula}</code>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditingCalc(calc)}>
                        Editar
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(calc.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Formula Reference */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">📚 Referência de Fórmulas</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><code className="bg-muted px-1 rounded">{`{campo}`}</code> - Referência a um campo</p>
            <p><code className="bg-muted px-1 rounded">+ - * /</code> - Operações básicas</p>
            <p><code className="bg-muted px-1 rounded">SUM(a, b, c)</code> - Soma de valores</p>
            <p><code className="bg-muted px-1 rounded">AVG(a, b, c)</code> - Média</p>
            <p><code className="bg-muted px-1 rounded">MIN(a, b)</code> / <code className="bg-muted px-1 rounded">MAX(a, b)</code> - Mínimo/Máximo</p>
            <p><code className="bg-muted px-1 rounded">IF(condição, valor_sim, valor_não)</code> - Condicional</p>
            <p><code className="bg-muted px-1 rounded">ROUND(valor, decimais)</code> - Arredondar</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
