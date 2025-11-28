import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCreateCadence } from "@/hooks/useCreateCadence";
import { useUpdateCadence } from "@/hooks/useUpdateCadence";
import { useCadenceSteps } from "@/hooks/useCadenceSteps";
import CadenceStepDialog from "./CadenceStepDialog";
import { Plus, Mail, MessageSquare, Phone, Linkedin, CheckSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";

const formSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface CadenceDialogProps {
  cadence?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CadenceDialog({ cadence, open, onOpenChange }: CadenceDialogProps) {
  const { mutate: createCadence, isPending: isCreating } = useCreateCadence();
  const { mutate: updateCadence, isPending: isUpdating } = useUpdateCadence();
  const { data: steps } = useCadenceSteps(cadence?.id);
  const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<any>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (cadence) {
      form.reset({
        name: cadence.name,
        description: cadence.description || "",
        is_active: cadence.is_active,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        is_active: true,
      });
    }
  }, [cadence, form]);

  const onSubmit = (data: FormData) => {
    if (cadence) {
      updateCadence(
        { id: cadence.id, ...data },
        {
          onSuccess: () => {
            // Não fechar se estiver editando (para permitir editar steps)
          },
        }
      );
    } else {
      createCadence({
        name: data.name,
        description: data.description,
        is_active: data.is_active,
      }, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      });
    }
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case "email": return <Mail className="h-4 w-4" />;
      case "whatsapp": return <MessageSquare className="h-4 w-4" />;
      case "call": return <Phone className="h-4 w-4" />;
      case "linkedin": return <Linkedin className="h-4 w-4" />;
      case "task": return <CheckSquare className="h-4 w-4" />;
      default: return null;
    }
  };

  const getStepTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      email: "Email",
      whatsapp: "WhatsApp",
      call: "Ligação",
      linkedin: "LinkedIn",
      task: "Tarefa",
    };
    return labels[type] || type;
  };

  const handleAddStep = () => {
    setSelectedStep(null);
    setIsStepDialogOpen(true);
  };

  const handleEditStep = (step: any) => {
    setSelectedStep(step);
    setIsStepDialogOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{cadence ? "Editar Cadência" : "Nova Cadência"}</DialogTitle>
            <DialogDescription>
              {cadence
                ? "Configure os detalhes e passos da cadência de prospecção"
                : "Crie uma nova cadência para automatizar seu follow-up"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Cadência *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Prospecção Fria B2B" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva o objetivo e público-alvo desta cadência..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Cadência Ativa</FormLabel>
                        <FormDescription>
                          Quando ativa, novos contatos podem ser inscritos e os passos serão executados
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Steps Section (only when editing) */}
              {cadence && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">📋 Passos da Cadência</h3>
                      <p className="text-sm text-muted-foreground">
                        Configure a sequência de ações do follow-up
                      </p>
                    </div>
                    <Button type="button" onClick={handleAddStep} variant="outline" size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Adicionar Passo
                    </Button>
                  </div>

                  {steps && steps.length > 0 ? (
                    <div className="space-y-3">
                      {steps.map((step, index) => (
                        <Card key={step.id} className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => handleEditStep(step)}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {getStepIcon(step.step_type)}
                                  <span className="font-medium">{getStepTypeLabel(step.step_type)}</span>
                                  <Badge variant={step.is_automated ? "default" : "secondary"} className="text-xs">
                                    {step.is_automated ? "Automático" : "Manual"}
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  <span className="font-medium">Dia {step.day_offset}</span>
                                  {step.task_title && <span className="ml-2">• {step.task_title}</span>}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                        <CheckSquare className="h-12 w-12 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Nenhum passo configurado. Adicione passos para definir a sequência da cadência.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {cadence ? "Fechar" : "Cancelar"}
                </Button>
                <Button type="submit" disabled={isCreating || isUpdating}>
                  {isCreating || isUpdating ? "Salvando..." : cadence ? "💾 Salvar Alterações" : "Criar Cadência"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Step Dialog */}
      {cadence && (
        <CadenceStepDialog
          cadenceId={cadence.id}
          step={selectedStep}
          open={isStepDialogOpen}
          onOpenChange={(open) => {
            setIsStepDialogOpen(open);
            if (!open) setSelectedStep(null);
          }}
        />
      )}
    </>
  );
}
