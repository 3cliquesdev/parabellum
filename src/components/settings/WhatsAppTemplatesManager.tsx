import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TemplateForm {
  name: string;
  language_code: string;
  category: string;
  description: string;
  has_variables: boolean;
  variable_examples: { index: number; example: string }[];
}

const EMPTY_FORM: TemplateForm = {
  name: "",
  language_code: "pt_BR",
  category: "UTILITY",
  description: "",
  has_variables: false,
  variable_examples: [],
};

export function WhatsAppTemplatesManager({ instanceId }: { instanceId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["whatsapp-templates", instanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_message_templates" as any)
        .select("*")
        .eq("instance_id", instanceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: TemplateForm & { id?: string }) => {
      const payload = {
        instance_id: instanceId,
        name: data.name.trim(),
        language_code: data.language_code,
        category: data.category,
        description: data.description || null,
        has_variables: data.has_variables,
        variable_examples: data.has_variables && data.variable_examples.length > 0
          ? data.variable_examples
          : null,
      };

      if (data.id) {
        const { error } = await supabase
          .from("whatsapp_message_templates" as any)
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("whatsapp_message_templates" as any)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates", instanceId] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      toast({ title: editingId ? "Template atualizado" : "Template cadastrado" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar template", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("whatsapp_message_templates" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates", instanceId] });
      toast({ title: "Template removido" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("whatsapp_message_templates" as any)
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates", instanceId] });
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (t: any) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      language_code: t.language_code,
      category: t.category || "UTILITY",
      description: t.description || "",
      has_variables: t.has_variables || false,
      variable_examples: t.variable_examples || [],
    });
    setDialogOpen(true);
  };

  const addVariable = () => {
    setForm(f => ({
      ...f,
      variable_examples: [...f.variable_examples, { index: f.variable_examples.length + 1, example: "" }],
    }));
  };

  const removeVariable = (idx: number) => {
    setForm(f => ({
      ...f,
      variable_examples: f.variable_examples
        .filter((_, i) => i !== idx)
        .map((v, i) => ({ ...v, index: i + 1 })),
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Templates de Mensagem (HSM)
            </CardTitle>
            <CardDescription>
              Cadastre os templates aprovados no Meta Business para reengajar clientes após a janela de 24h
            </CardDescription>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Novo Template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum template cadastrado. Os templates devem ser aprovados no Meta Business Manager antes de serem cadastrados aqui.
          </p>
        ) : (
          <div className="space-y-3">
            {templates.map((t: any) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{t.name}</span>
                    <Badge variant="outline" className="text-[10px]">{t.language_code}</Badge>
                    <Badge variant={t.category === "MARKETING" ? "warning" : "secondary"} className="text-[10px]">
                      {t.category}
                    </Badge>
                    {!t.is_active && <Badge variant="outline" className="text-[10px] text-muted-foreground">Inativo</Badge>}
                  </div>
                  {t.description && (
                    <p className="text-xs text-muted-foreground truncate">{t.description}</p>
                  )}
                  {t.has_variables && t.variable_examples?.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t.variable_examples.length} variável(is)
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={t.is_active}
                    onCheckedChange={(checked) => toggleActive.mutate({ id: t.id, is_active: checked })}
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => deleteMutation.mutate(t.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Template" : "Novo Template"}</DialogTitle>
            <DialogDescription>
              O nome deve ser idêntico ao template aprovado no Meta Business Manager.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do template *</Label>
              <Input
                placeholder="ex: reengajamento_cliente"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Idioma</Label>
                <Select value={form.language_code} onValueChange={v => setForm(f => ({ ...f, language_code: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt_BR">Português (BR)</SelectItem>
                    <SelectItem value="en_US">English (US)</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTILITY">Utilidade</SelectItem>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                    <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição interna</Label>
              <Textarea
                placeholder="Descrição para ajudar o agente a escolher o template correto"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.has_variables}
                onCheckedChange={checked => setForm(f => ({ ...f, has_variables: checked }))}
              />
              <Label>Template com variáveis</Label>
            </div>

            {form.has_variables && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Variáveis (exemplos)</Label>
                  <Button variant="outline" size="xs" onClick={addVariable}>
                    <Plus className="h-3 w-3 mr-1" /> Variável
                  </Button>
                </div>
                {form.variable_examples.map((v, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-6">{`{{${v.index}}}`}</span>
                    <Input
                      className="h-8 text-sm"
                      placeholder={`Ex: Nome do cliente`}
                      value={v.example}
                      onChange={e => {
                        const updated = [...form.variable_examples];
                        updated[idx] = { ...updated[idx], example: e.target.value };
                        setForm(f => ({ ...f, variable_examples: updated }));
                      }}
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeVariable(idx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => saveMutation.mutate({ ...form, id: editingId || undefined })}
              disabled={!form.name.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
