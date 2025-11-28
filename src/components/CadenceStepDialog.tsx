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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";

const formSchema = z.object({
  position: z.number().min(0),
  day_offset: z.number().min(0),
  step_type: z.enum(["email", "whatsapp", "call", "linkedin", "task"]),
  is_automated: z.boolean().default(false),
  template_id: z.string().optional(),
  message_template: z.string().optional(),
  task_title: z.string().optional(),
  task_description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CadenceStepDialogProps {
  cadenceId: string;
  step?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CadenceStepDialog({
  cadenceId,
  step,
  open,
  onOpenChange,
}: CadenceStepDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: emailTemplates } = useEmailTemplates();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      position: 0,
      day_offset: 0,
      step_type: "email",
      is_automated: false,
      template_id: "",
      message_template: "",
      task_title: "",
      task_description: "",
    },
  });

  const stepType = form.watch("step_type");
  const isAutomated = form.watch("is_automated");

  useEffect(() => {
    if (step) {
      form.reset({
        position: step.position,
        day_offset: step.day_offset,
        step_type: step.step_type,
        is_automated: step.is_automated,
        template_id: step.template_id || "",
        message_template: step.message_template || "",
        task_title: step.task_title || "",
        task_description: step.task_description || "",
      });
    } else {
      form.reset({
        position: 0,
        day_offset: 0,
        step_type: "email",
        is_automated: false,
        template_id: "",
        message_template: "",
        task_title: "",
        task_description: "",
      });
    }
  }, [step, form]);

  const createStepMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await supabase.from("cadence_steps").insert({
        cadence_id: cadenceId,
        position: data.position,
        day_offset: data.day_offset,
        step_type: data.step_type,
        is_automated: data.is_automated,
        template_id: data.template_id || null,
        message_template: data.message_template || null,
        task_title: data.task_title || null,
        task_description: data.task_description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadence-steps"] });
      toast({ title: "Passo criado com sucesso" });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar passo",
        description: error.message,
      });
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await supabase
        .from("cadence_steps")
        .update(data)
        .eq("id", step.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadence-steps"] });
      toast({ title: "Passo atualizado com sucesso" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar passo",
        description: error.message,
      });
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("cadence_steps").delete().eq("id", step.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadence-steps"] });
      toast({ title: "Passo deletado com sucesso" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao deletar passo",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (step) {
      updateStepMutation.mutate(data);
    } else {
      createStepMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (confirm("Tem certeza que deseja deletar este passo?")) {
      deleteStepMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{step ? "Editar Passo" : "Novo Passo"}</DialogTitle>
          <DialogDescription>
            Configure um passo da cadência de prospecção
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="day_offset"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia de Execução *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>Dia 0 = hoje, 1 = amanhã, etc</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posição *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>Ordem de execução</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="step_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Ação *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="email">📧 Email</SelectItem>
                      <SelectItem value="whatsapp">📱 WhatsApp</SelectItem>
                      <SelectItem value="call">📞 Ligação</SelectItem>
                      <SelectItem value="linkedin">💼 LinkedIn</SelectItem>
                      <SelectItem value="task">✅ Tarefa Genérica</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_automated"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Automático</FormLabel>
                    <FormDescription>
                      {stepType === "email"
                        ? "Email será enviado automaticamente"
                        : "Quando desativado, gera tarefa para o vendedor executar manualmente"}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Email Template */}
            {stepType === "email" && isAutomated && (
              <FormField
                control={form.control}
                name="template_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template de Email</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um template" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {emailTemplates?.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* WhatsApp/LinkedIn Template */}
            {(stepType === "whatsapp" || stepType === "linkedin") && (
              <FormField
                control={form.control}
                name="message_template"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template de Mensagem</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Oi {{nome}}, viu meu email sobre..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Use {"{{nome}}"}, {"{{empresa}}"}, etc. para personalização
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Task Details */}
            {!isAutomated && (
              <>
                <FormField
                  control={form.control}
                  name="task_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título da Tarefa</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Ligar para apresentar proposta" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="task_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição da Tarefa</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Instruções para o vendedor..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className="flex justify-between pt-4">
              {step && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteStepMutation.isPending}
                >
                  {deleteStepMutation.isPending ? "Deletando..." : "Deletar Passo"}
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createStepMutation.isPending || updateStepMutation.isPending}
                >
                  {createStepMutation.isPending || updateStepMutation.isPending
                    ? "Salvando..."
                    : step
                    ? "Salvar Alterações"
                    : "Criar Passo"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
