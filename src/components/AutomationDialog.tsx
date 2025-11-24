import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateAutomation } from "@/hooks/useCreateAutomation";
import { useUpdateAutomation } from "@/hooks/useUpdateAutomation";
import { useSalesReps } from "@/hooks/useSalesReps";
import { useTags } from "@/hooks/useTags";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  trigger_event: z.enum([
    "deal_created",
    "deal_won",
    "deal_lost",
    "deal_stage_changed",
    "activity_overdue",
    "contact_created",
    "contact_inactive",
  ]),
  trigger_conditions: z.object({
    value_gte: z.number().optional(),
    value_lte: z.number().optional(),
    pipeline_id: z.string().optional(),
    days_inactive: z.number().optional(),
  }).optional(),
  action_type: z.enum([
    "assign_to_user",
    "create_activity",
    "add_tag",
    "send_notification",
    "change_status",
  ]),
  action_config: z.object({
    strategy: z.string().optional(),
    department: z.string().optional(),
    user_id: z.string().optional(),
    type: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    days_offset: z.number().optional(),
    tag_name: z.string().optional(),
    tag_color: z.string().optional(),
    message: z.string().optional(),
    status: z.string().optional(),
  }).default({}),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface AutomationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automation?: any;
}

export function AutomationDialog({ open, onOpenChange, automation }: AutomationDialogProps) {
  const createMutation = useCreateAutomation();
  const updateMutation = useUpdateAutomation();
  const { data: salesReps } = useSalesReps();
  const { data: tags } = useTags();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      trigger_event: "deal_created",
      trigger_conditions: {},
      action_type: "assign_to_user",
      action_config: {},
      is_active: true,
    },
  });

  useEffect(() => {
    if (automation) {
      form.reset({
        name: automation.name,
        description: automation.description || "",
        trigger_event: automation.trigger_event,
        trigger_conditions: automation.trigger_conditions || {},
        action_type: automation.action_type,
        action_config: automation.action_config || {},
        is_active: automation.is_active,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        trigger_event: "deal_created",
        trigger_conditions: {},
        action_type: "assign_to_user",
        action_config: {},
        is_active: true,
      });
    }
  }, [automation, form]);

  const onSubmit = (data: FormValues) => {
    const payload = {
      ...data,
      action_config: data.action_config || {},
      trigger_conditions: data.trigger_conditions || {},
    };

    if (automation) {
      updateMutation.mutate(
        { id: automation.id, ...payload },
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset();
          },
        }
      );
    } else {
      createMutation.mutate(payload as any, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      });
    }
  };

  const watchActionType = form.watch("action_type");
  const watchTriggerEvent = form.watch("trigger_event");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {automation ? "Editar Automação" : "Nova Automação"}
          </DialogTitle>
          <DialogDescription>
            Configure o gatilho e a ação que será executada automaticamente
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Automação</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Auto-assign leads comerciais" {...field} />
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
                    <Textarea placeholder="Descreva o que esta automação faz..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Quando (Gatilho)</h3>
              
              <FormField
                control={form.control}
                name="trigger_event"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evento Gatilho</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="deal_created">Negócio Criado</SelectItem>
                        <SelectItem value="deal_won">Negócio Ganho</SelectItem>
                        <SelectItem value="deal_lost">Negócio Perdido</SelectItem>
                        <SelectItem value="deal_stage_changed">Etapa Alterada</SelectItem>
                        <SelectItem value="activity_overdue">Atividade Vencida</SelectItem>
                        <SelectItem value="contact_created">Contato Criado</SelectItem>
                        <SelectItem value="contact_inactive">Contato Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchTriggerEvent === "deal_created" && (
                <FormField
                  control={form.control}
                  name="trigger_conditions.value_gte"
                  render={({ field }) => (
                    <FormItem className="mt-3">
                      <FormLabel>Valor Mínimo (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Ex: 50000"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchTriggerEvent === "contact_inactive" && (
                <FormField
                  control={form.control}
                  name="trigger_conditions.days_inactive"
                  render={({ field }) => (
                    <FormItem className="mt-3">
                      <FormLabel>Dias sem Atividade</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Ex: 30"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">O Que Fazer (Ação)</h3>
              
              <FormField
                control={form.control}
                name="action_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Ação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="assign_to_user">Atribuir Vendedor</SelectItem>
                        <SelectItem value="create_activity">Criar Atividade</SelectItem>
                        <SelectItem value="add_tag">Adicionar Tag</SelectItem>
                        <SelectItem value="send_notification">Enviar Notificação</SelectItem>
                        <SelectItem value="change_status">Mudar Status</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchActionType === "assign_to_user" && (
                <>
                  <FormField
                    control={form.control}
                    name="action_config.strategy"
                    render={({ field }) => (
                      <FormItem className="mt-3">
                        <FormLabel>Estratégia</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="round_robin">Round Robin</SelectItem>
                            <SelectItem value="specific_user">Usuário Específico</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("action_config.strategy") === "specific_user" && (
                    <FormField
                      control={form.control}
                      name="action_config.user_id"
                      render={({ field }) => (
                        <FormItem className="mt-3">
                          <FormLabel>Vendedor</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {salesReps?.map((rep) => (
                                <SelectItem key={rep.id} value={rep.id}>
                                  {rep.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}

              {watchActionType === "create_activity" && (
                <>
                  <FormField
                    control={form.control}
                    name="action_config.type"
                    render={({ field }) => (
                      <FormItem className="mt-3">
                        <FormLabel>Tipo de Atividade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="call">Ligação</SelectItem>
                            <SelectItem value="meeting">Reunião</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="task">Tarefa</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="action_config.title"
                    render={({ field }) => (
                      <FormItem className="mt-3">
                        <FormLabel>Título da Atividade</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Follow-up com cliente" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="action_config.days_offset"
                    render={({ field }) => (
                      <FormItem className="mt-3">
                        <FormLabel>Criar em quantos dias?</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ex: 7"
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {watchActionType === "add_tag" && (
                <FormField
                  control={form.control}
                  name="action_config.tag_name"
                  render={({ field }) => (
                    <FormItem className="mt-3">
                      <FormLabel>Nome da Tag</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: High Value" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchActionType === "send_notification" && (
                <FormField
                  control={form.control}
                  name="action_config.message"
                  render={({ field }) => (
                    <FormItem className="mt-3">
                      <FormLabel>Mensagem</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Digite a mensagem da notificação..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {automation ? "Salvar" : "Criar Automação"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
