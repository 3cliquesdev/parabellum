import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateEmailTemplate } from "@/hooks/useCreateEmailTemplate";
import { useUpdateEmailTemplate } from "@/hooks/useUpdateEmailTemplate";
import type { Tables } from "@/integrations/supabase/types";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  subject: z.string().min(1, "Assunto é obrigatório"),
  html_body: z.string().min(1, "Corpo do email é obrigatório"),
  trigger_type: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface EmailTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: Tables<"email_templates">;
}

export function EmailTemplateDialog({
  open,
  onOpenChange,
  template,
}: EmailTemplateDialogProps) {
  const createMutation = useCreateEmailTemplate();
  const updateMutation = useUpdateEmailTemplate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      subject: "",
      html_body: "",
      trigger_type: null,
      is_active: true,
    },
  });

  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        subject: template.subject,
        html_body: template.html_body,
        trigger_type: template.trigger_type,
        is_active: template.is_active,
      });
    } else {
      form.reset({
        name: "",
        subject: "",
        html_body: "",
        trigger_type: null,
        is_active: true,
      });
    }
  }, [template, form, open]);

  const onSubmit = async (data: FormValues) => {
    try {
      // Extract variables from html_body
      const variableRegex = /\{\{([^}]+)\}\}/g;
      const matches = data.html_body.matchAll(variableRegex);
      const variables = Array.from(matches, m => m[1]);

      if (template) {
        await updateMutation.mutateAsync({
          id: template.id,
          name: data.name,
          subject: data.subject,
          html_body: data.html_body,
          trigger_type: data.trigger_type,
          is_active: data.is_active,
          variables: variables,
        });
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          subject: data.subject,
          html_body: data.html_body,
          trigger_type: data.trigger_type,
          is_active: data.is_active,
          variables: variables,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting template:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? "Editar Template" : "Novo Template de Email"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Template</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Boas-vindas" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trigger_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Trigger (Opcional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um trigger" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="deal_created">Negócio Criado</SelectItem>
                      <SelectItem value="deal_won">Negócio Ganho</SelectItem>
                      <SelectItem value="deal_lost">Negócio Perdido</SelectItem>
                      <SelectItem value="contact_created">Contato Criado</SelectItem>
                      <SelectItem value="contact_inactive">Contato Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Associe este template a um evento específico
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assunto do Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Bem-vindo ao nosso CRM!" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="html_body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Corpo do Email (HTML)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Use variáveis como {{customer_name}}, {{deal_title}}, {{deal_value}}"
                      className="min-h-[200px] font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Variáveis disponíveis: {"{{"} customer_name {"}}"}, {"{{"} deal_title {"}}"}, {"{{"} deal_value {"}}"}, {"{{"} deal_currency {"}}"}
                  </FormDescription>
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
                    <FormLabel className="text-base">Template Ativo</FormLabel>
                    <FormDescription>
                      Templates ativos podem ser usados em automações
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {template ? "Salvar" : "Criar Template"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
