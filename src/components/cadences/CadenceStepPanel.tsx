import { useState, useEffect } from "react";
import { X, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CadenceStepPanelProps {
  step: any;
  stepConfig: Record<string, { label: string; icon: any; color: string }>;
  onUpdate: (updates: any) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function CadenceStepPanel({ step, stepConfig, onUpdate, onDelete, onClose }: CadenceStepPanelProps) {
  const [formData, setFormData] = useState({
    task_title: step.task_title || "",
    task_description: step.task_description || "",
    day_offset: step.day_offset || 0,
    message_template: step.message_template || "",
    is_automated: step.is_automated ?? false,
    condition_type: step.condition_type || "",
  });

  useEffect(() => {
    setFormData({
      task_title: step.task_title || "",
      task_description: step.task_description || "",
      day_offset: step.day_offset || 0,
      message_template: step.message_template || "",
      is_automated: step.is_automated ?? false,
      condition_type: step.condition_type || "",
    });
  }, [step]);

  const handleSave = () => {
    onUpdate(formData);
  };

  const config = stepConfig[step.step_type];
  const Icon = config?.icon;

  const isDelay = step.step_type === "delay";
  const isCondition = step.step_type === "condition";
  const isEmail = step.step_type === "email";
  const hasMessage = ["email", "whatsapp", "sms", "linkedin"].includes(step.step_type);

  return (
    <div className="w-96 border-l bg-card h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {Icon && (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${config?.color}20` }}
            >
              <Icon className="h-4 w-4" style={{ color: config?.color }} />
            </div>
          )}
          <div>
            <h3 className="font-semibold">{config?.label}</h3>
            <p className="text-xs text-muted-foreground">Editar propriedades</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Title (não para delay) */}
          {!isDelay && (
            <div className="space-y-2">
              <Label>Título do Passo</Label>
              <Input
                value={formData.task_title}
                onChange={(e) => setFormData({ ...formData, task_title: e.target.value })}
                placeholder="Ex: Email de apresentação"
              />
            </div>
          )}

          {/* Day Offset */}
          <div className="space-y-2">
            <Label>{isDelay ? "Dias de Espera" : "Executar no Dia"}</Label>
            <Input
              type="number"
              min={0}
              value={formData.day_offset}
              onChange={(e) => setFormData({ ...formData, day_offset: parseInt(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">
              {isDelay
                ? "Quantos dias aguardar antes do próximo passo"
                : "Dia relativo ao início da cadência (0 = primeiro dia)"}
            </p>
          </div>

          {/* Condition Type */}
          {isCondition && (
            <div className="space-y-2">
              <Label>Condição</Label>
              <Select
                value={formData.condition_type}
                onValueChange={(value) => setFormData({ ...formData, condition_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a condição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="replied">Se respondeu</SelectItem>
                  <SelectItem value="email_opened">Se abriu o email</SelectItem>
                  <SelectItem value="link_clicked">Se clicou no link</SelectItem>
                  <SelectItem value="no_response">Se não respondeu</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define quando o lead segue pelo caminho principal ou alternativo
              </p>
            </div>
          )}

          {/* Message Template */}
          {hasMessage && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>
                  {isEmail ? "Corpo do Email" : "Mensagem"}
                </Label>
                <Textarea
                  value={formData.message_template}
                  onChange={(e) => setFormData({ ...formData, message_template: e.target.value })}
                  placeholder={
                    isEmail
                      ? "Olá {{first_name}},\n\nEspero que esteja bem..."
                      : "Oi {{first_name}}, tudo bem?"
                  }
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis: {"{{first_name}}"}, {"{{last_name}}"}, {"{{company}}"}, {"{{sender_name}}"}
                </p>
              </div>

              {isEmail && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Preview</h4>
                  <div className="text-sm whitespace-pre-wrap bg-background p-3 rounded border max-h-40 overflow-auto">
                    {formData.message_template
                      .replace(/\{\{first_name\}\}/g, "João")
                      .replace(/\{\{last_name\}\}/g, "Silva")
                      .replace(/\{\{company\}\}/g, "Empresa XYZ")
                      .replace(/\{\{sender_name\}\}/g, "Você")
                      .replace(/\{\{company_name\}\}/g, "Sua Empresa") || (
                      <span className="text-muted-foreground italic">Digite a mensagem acima para ver o preview...</span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Description (para tasks) */}
          {step.step_type === "task" && (
            <div className="space-y-2">
              <Label>Descrição da Tarefa</Label>
              <Textarea
                value={formData.task_description}
                onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
                placeholder="Descreva o que precisa ser feito..."
                rows={4}
              />
            </div>
          )}

          {/* Call script */}
          {step.step_type === "call" && (
            <div className="space-y-2">
              <Label>Script da Ligação</Label>
              <Textarea
                value={formData.message_template}
                onChange={(e) => setFormData({ ...formData, message_template: e.target.value })}
                placeholder="- Apresentar-se\n- Perguntar sobre desafios\n- Propor demonstração"
                rows={6}
              />
            </div>
          )}

          {/* Automation Toggle */}
          {!isDelay && !isCondition && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Execução Automática</Label>
                  <p className="text-xs text-muted-foreground">
                    {formData.is_automated
                      ? "Sistema executa automaticamente"
                      : "Aparece como tarefa manual no Workzone"}
                  </p>
                </div>
                <Switch
                  checked={formData.is_automated}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_automated: checked })}
                  disabled={step.step_type !== "email"} // Only email can be automated for now
                />
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t shrink-0 flex items-center justify-between">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-2">
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir passo?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O passo será removido permanentemente da cadência.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Salvar
        </Button>
      </div>
    </div>
  );
}
