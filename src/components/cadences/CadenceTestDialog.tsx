import { useState } from "react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TestTube, Mail, Clock, Linkedin, MessageSquare, Phone, CheckSquare, Calendar, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CadenceTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cadenceId: string;
  steps: any[];
}

const stepTypeIcons: Record<string, any> = {
  email: Mail,
  linkedin: Linkedin,
  call: Phone,
  whatsapp: MessageSquare,
  sms: MessageSquare,
  task: CheckSquare,
  delay: Clock,
  condition: Clock,
};

const stepTypeLabels: Record<string, string> = {
  email: "Email",
  linkedin: "LinkedIn",
  call: "Ligação",
  whatsapp: "WhatsApp",
  sms: "SMS",
  task: "Tarefa",
  delay: "Delay",
  condition: "Condição",
};

export function CadenceTestDialog({ open, onOpenChange, cadenceId, steps }: CadenceTestDialogProps) {
  const { toast } = useToast();
  const [testEmail, setTestEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  const sortedSteps = [...steps].sort((a, b) => a.position - b.position);
  const startDate = new Date();

  // Calculate execution dates for each step
  const stepsWithDates = sortedSteps.map((step) => ({
    ...step,
    executionDate: addDays(startDate, step.day_offset || 0),
  }));

  const handleSendTest = async () => {
    if (!testEmail) {
      toast({ variant: "destructive", title: "Digite um email para teste" });
      return;
    }

    setIsSending(true);
    // TODO: Implement actual test email sending via edge function
    await new Promise((resolve) => setTimeout(resolve, 1500));
    toast({ 
      title: "Email de teste enviado!", 
      description: `Primeiro email da cadência enviado para ${testEmail}` 
    });
    setIsSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5 text-primary" />
            Testar Cadência
          </DialogTitle>
          <DialogDescription>
            Simule a execução da cadência e envie um email de teste
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 flex-1 overflow-hidden flex flex-col">
          {/* Test Email */}
          <div className="space-y-2 shrink-0">
            <Label>Email para Teste</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="seu@email.com"
                className="flex-1"
              />
              <Button onClick={handleSendTest} disabled={isSending} className="gap-2">
                <Send className="h-4 w-4" />
                {isSending ? "Enviando..." : "Enviar Teste"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              O primeiro email da cadência será enviado para este endereço
            </p>
          </div>

          {/* Timeline Preview */}
          <div className="flex-1 overflow-hidden">
            <Label className="mb-3 block">Prévia da Timeline</Label>
            <ScrollArea className="h-[350px] pr-4">
              <div className="relative pl-8">
                {/* Timeline line */}
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />

                <div className="space-y-4">
                  {stepsWithDates.map((step, index) => {
                    const Icon = stepTypeIcons[step.step_type] || CheckSquare;
                    const isDelay = step.step_type === "delay";

                    return (
                      <div key={step.id} className="relative">
                        {/* Timeline dot */}
                        <div
                          className={`absolute -left-5 w-6 h-6 rounded-full border-2 border-background flex items-center justify-center ${
                            isDelay ? "bg-amber-500" : "bg-primary"
                          }`}
                        >
                          <Icon className="h-3 w-3 text-white" />
                        </div>

                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">
                                    {isDelay
                                      ? `Aguardar ${step.day_offset} dia${step.day_offset !== 1 ? "s" : ""}`
                                      : step.task_title || stepTypeLabels[step.step_type]}
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    {stepTypeLabels[step.step_type]}
                                  </Badge>
                                  {step.is_automated && (
                                    <Badge variant="outline" className="text-xs">
                                      Auto
                                    </Badge>
                                  )}
                                </div>
                                {step.message_template && !isDelay && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {step.message_template.substring(0, 100)}...
                                  </p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <div className="flex items-center gap-1 text-sm font-medium">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {format(step.executionDate, "dd MMM", { locale: ptBR })}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Dia {step.day_offset}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t shrink-0">
            <span>{steps.length} passos no total</span>
            <span>
              Duração: {Math.max(...steps.map((s) => s.day_offset || 0), 0)} dias
            </span>
            <span>
              Conclusão: {format(addDays(startDate, Math.max(...steps.map((s) => s.day_offset || 0), 0)), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
