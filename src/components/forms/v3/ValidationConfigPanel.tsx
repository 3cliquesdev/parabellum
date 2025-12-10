import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, Shield, TestTube } from "lucide-react";
import { validate, type ValidationType, formatCPF, formatCNPJ, formatPhoneBR, formatCEP } from "@/lib/validators";
import type { FormField } from "@/hooks/useForms";

interface ValidationConfigPanelProps {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
}

interface ExtendedFormField extends FormField {
  validation_type?: ValidationType;
  validation_regex?: string;
  validation_message?: string;
}

const VALIDATION_TYPES = [
  { value: 'none', label: 'Sem validação', description: 'Aceita qualquer valor' },
  { value: 'cpf', label: 'CPF', description: 'Valida dígitos verificadores' },
  { value: 'cnpj', label: 'CNPJ', description: 'Valida dígitos verificadores' },
  { value: 'corporate_email', label: 'E-mail Corporativo', description: 'Bloqueia emails pessoais' },
  { value: 'email', label: 'E-mail', description: 'Formato de email válido' },
  { value: 'phone_br', label: 'Telefone BR', description: 'Formato brasileiro com DDD' },
  { value: 'cep', label: 'CEP', description: 'Formato 00000-000' },
  { value: 'url', label: 'URL', description: 'Endereço web válido' },
  { value: 'custom_regex', label: 'Regex Personalizado', description: 'Padrão customizado' },
];

export default function ValidationConfigPanel({ field, onUpdate }: ValidationConfigPanelProps) {
  const extendedField = field as ExtendedFormField;
  const [testValue, setTestValue] = useState('');
  const [testResult, setTestResult] = useState<{ valid: boolean; message?: string } | null>(null);
  
  const handleValidationTypeChange = (type: string) => {
    if (type === 'none') {
      onUpdate({ 
        validation_type: undefined, 
        validation_regex: undefined, 
        validation_message: undefined 
      } as any);
    } else {
      onUpdate({ validation_type: type as ValidationType } as any);
    }
  };
  
  const handleTest = () => {
    if (!extendedField.validation_type) {
      setTestResult({ valid: true, message: 'Sem validação configurada' });
      return;
    }
    
    const result = validate(
      extendedField.validation_type,
      testValue,
      {
        pattern: extendedField.validation_regex,
        message: extendedField.validation_message,
      }
    );
    setTestResult(result);
  };
  
  const formatTestValue = (value: string) => {
    switch (extendedField.validation_type) {
      case 'cpf':
        return formatCPF(value);
      case 'cnpj':
        return formatCNPJ(value);
      case 'phone_br':
        return formatPhoneBR(value);
      case 'cep':
        return formatCEP(value);
      default:
        return value;
    }
  };
  
  const currentValidation = VALIDATION_TYPES.find(v => v.value === (extendedField.validation_type || 'none'));
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Validação do Campo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Validation Type Selector */}
        <div>
          <Label>Tipo de Validação</Label>
          <Select
            value={extendedField.validation_type || 'none'}
            onValueChange={handleValidationTypeChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VALIDATION_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  <div>
                    <span>{type.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {type.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Current validation badge */}
        {currentValidation && currentValidation.value !== 'none' && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {currentValidation.label}
            </Badge>
          </div>
        )}
        
        {/* Custom Regex Configuration */}
        {extendedField.validation_type === 'custom_regex' && (
          <div className="space-y-3">
            <div>
              <Label>Padrão Regex</Label>
              <Input
                value={extendedField.validation_regex || ''}
                onChange={(e) => onUpdate({ validation_regex: e.target.value } as any)}
                placeholder="Ex: ^[A-Z]{2}\d{4}$"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use padrões JavaScript válidos
              </p>
            </div>
            <div>
              <Label>Mensagem de Erro Personalizada</Label>
              <Input
                value={extendedField.validation_message || ''}
                onChange={(e) => onUpdate({ validation_message: e.target.value } as any)}
                placeholder="Ex: Formato inválido. Use XX0000"
              />
            </div>
          </div>
        )}
        
        {/* Custom error message for built-in validations */}
        {extendedField.validation_type && extendedField.validation_type !== 'custom_regex' && (
          <div>
            <Label>Mensagem de Erro (opcional)</Label>
            <Input
              value={extendedField.validation_message || ''}
              onChange={(e) => onUpdate({ validation_message: e.target.value } as any)}
              placeholder="Deixe vazio para usar mensagem padrão"
            />
          </div>
        )}
        
        {/* Test Section */}
        {extendedField.validation_type && (
          <div className="border-t pt-4">
            <Label className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Testar Validação
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={testValue}
                onChange={(e) => {
                  const formatted = formatTestValue(e.target.value);
                  setTestValue(formatted);
                  setTestResult(null);
                }}
                placeholder="Digite um valor para testar..."
                className="flex-1"
              />
              <Button onClick={handleTest} variant="outline" size="sm">
                Testar
              </Button>
            </div>
            {testResult && (
              <div className={`flex items-center gap-2 mt-2 text-sm ${testResult.valid ? 'text-green-600' : 'text-destructive'}`}>
                {testResult.valid ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {testResult.valid ? 'Valor válido!' : testResult.message}
              </div>
            )}
          </div>
        )}
        
        {/* Validation Tips */}
        {extendedField.validation_type && (
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <strong>Dicas:</strong>
            {extendedField.validation_type === 'cpf' && (
              <p>CPF é validado com o algoritmo oficial da Receita Federal.</p>
            )}
            {extendedField.validation_type === 'cnpj' && (
              <p>CNPJ é validado com o algoritmo oficial.</p>
            )}
            {extendedField.validation_type === 'corporate_email' && (
              <p>Bloqueia domínios como gmail.com, hotmail.com, yahoo.com, etc.</p>
            )}
            {extendedField.validation_type === 'phone_br' && (
              <p>Aceita formatos com ou sem máscara. DDD é validado.</p>
            )}
            {extendedField.validation_type === 'cep' && (
              <p>Formato: 00000-000 ou 00000000</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
