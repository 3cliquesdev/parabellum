import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Zap, Play, Mail, Tag, Ticket, Briefcase, Webhook, UserCog } from "lucide-react";
import type { FormField } from "@/hooks/useForms";
import { 
  useFormAutomations, 
  useCreateFormAutomation, 
  useUpdateFormAutomation, 
  useDeleteFormAutomation,
  useToggleFormAutomation,
  getActionTypeLabel,
  getTriggerTypeLabel,
  type FormAutomation,
  type TriggerType,
  type ActionType,
  type TriggerConfig,
  type ActionConfig,
} from "@/hooks/useFormAutomations";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FormAutomationsPanelProps {
  formId: string;
  fields: FormField[];
}

const ACTION_ICONS: Record<ActionType, React.ReactNode> = {
  start_playbook: <Play className="h-4 w-4" />,
  send_email: <Mail className="h-4 w-4" />,
  create_deal: <Briefcase className="h-4 w-4" />,
  create_ticket: <Ticket className="h-4 w-4" />,
  add_tag: <Tag className="h-4 w-4" />,
  webhook: <Webhook className="h-4 w-4" />,
  update_contact: <UserCog className="h-4 w-4" />,
};

export default function FormAutomationsPanel({ formId, fields }: FormAutomationsPanelProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  const [newAutomation, setNewAutomation] = useState({
    name: '',
    trigger_type: 'on_submit' as TriggerType,
    trigger_config: {} as TriggerConfig,
    action_type: 'start_playbook' as ActionType,
    action_config: {} as ActionConfig,
    is_active: true,
    priority: 0,
  });
  
  const { data: automations = [], isLoading } = useFormAutomations(formId);
  const createAutomation = useCreateFormAutomation();
  const deleteAutomation = useDeleteFormAutomation();
  const toggleAutomation = useToggleFormAutomation();
  
  // Fetch related data for action configs
  const { data: playbooks = [] } = useQuery({
    queryKey: ['playbooks-for-automations'],
    queryFn: async () => {
      const { data } = await supabase.from('onboarding_playbooks').select('id, name').eq('is_active', true);
      return (data || []) as { id: string; name: string }[];
    },
  });
  
  const { data: emailTemplates = [] } = useQuery({
    queryKey: ['email-templates-list'],
    queryFn: async () => {
      const { data } = await supabase.from('email_templates').select('id, name').eq('is_active', true);
      return data || [];
    },
  });
  
  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines-list'],
    queryFn: async () => {
      const { data } = await supabase.from('pipelines').select('id, name, stages(id, name)');
      return data || [];
    },
  });
  
  const { data: tags = [] } = useQuery({
    queryKey: ['tags-list'],
    queryFn: async () => {
      const { data } = await supabase.from('tags').select('id, name, color');
      return data || [];
    },
  });
  
  const { data: departments = [] } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('id, name').eq('is_active', true);
      return data || [];
    },
  });
  
  const handleCreate = () => {
    createAutomation.mutate({
      form_id: formId,
      ...newAutomation,
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setStep(1);
        setNewAutomation({
          name: '',
          trigger_type: 'on_submit',
          trigger_config: {},
          action_type: 'start_playbook',
          action_config: {},
          is_active: true,
          priority: automations.length,
        });
      }
    });
  };
  
  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta automação?')) {
      deleteAutomation.mutate({ id, formId });
    }
  };
  
  const handleToggle = (id: string, isActive: boolean) => {
    toggleAutomation.mutate({ id, formId, isActive });
  };
  
  const renderTriggerConfig = () => {
    switch (newAutomation.trigger_type) {
      case 'on_field_change':
        return (
          <div>
            <Label>Campo que dispara</Label>
            <Select
              value={newAutomation.trigger_config.field_id || ''}
              onValueChange={(value) => setNewAutomation(prev => ({
                ...prev,
                trigger_config: { ...prev.trigger_config, field_id: value }
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um campo..." />
              </SelectTrigger>
              <SelectContent>
                {fields.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 'on_score_threshold':
        return (
          <div className="space-y-3">
            <div>
              <Label>Nome do Score</Label>
              <Input
                value={newAutomation.trigger_config.score_field || ''}
                onChange={(e) => setNewAutomation(prev => ({
                  ...prev,
                  trigger_config: { ...prev.trigger_config, score_field: e.target.value }
                }))}
                placeholder="Ex: score_qualificacao"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Operador</Label>
                <Select
                  value={newAutomation.trigger_config.score_operator || 'greater_than'}
                  onValueChange={(value: any) => setNewAutomation(prev => ({
                    ...prev,
                    trigger_config: { ...prev.trigger_config, score_operator: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="greater_than">Maior que</SelectItem>
                    <SelectItem value="less_than">Menor que</SelectItem>
                    <SelectItem value="equals">Igual a</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor</Label>
                <Input
                  type="number"
                  value={newAutomation.trigger_config.score_value || 0}
                  onChange={(e) => setNewAutomation(prev => ({
                    ...prev,
                    trigger_config: { ...prev.trigger_config, score_value: parseFloat(e.target.value) }
                  }))}
                />
              </div>
            </div>
          </div>
        );
      default:
        return (
          <p className="text-sm text-muted-foreground">
            Esta automação será disparada automaticamente ao enviar o formulário.
          </p>
        );
    }
  };
  
  const renderActionConfig = () => {
    switch (newAutomation.action_type) {
      case 'start_playbook':
        return (
          <div>
            <Label>Playbook</Label>
            <Select
              value={newAutomation.action_config.playbook_id || ''}
              onValueChange={(value) => setNewAutomation(prev => ({
                ...prev,
                action_config: { ...prev.action_config, playbook_id: value }
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um playbook..." />
              </SelectTrigger>
              <SelectContent>
                {playbooks.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 'send_email':
        return (
          <div>
            <Label>Template de Email</Label>
            <Select
              value={newAutomation.action_config.template_id || ''}
              onValueChange={(value) => setNewAutomation(prev => ({
                ...prev,
                action_config: { ...prev.action_config, template_id: value }
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template..." />
              </SelectTrigger>
              <SelectContent>
                {emailTemplates.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 'create_deal':
        return (
          <div className="space-y-3">
            <div>
              <Label>Pipeline</Label>
              <Select
                value={newAutomation.action_config.pipeline_id || ''}
                onValueChange={(value) => setNewAutomation(prev => ({
                  ...prev,
                  action_config: { ...prev.action_config, pipeline_id: value, stage_id: undefined }
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um pipeline..." />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newAutomation.action_config.pipeline_id && (
              <div>
                <Label>Etapa Inicial</Label>
                <Select
                  value={newAutomation.action_config.stage_id || ''}
                  onValueChange={(value) => setNewAutomation(prev => ({
                    ...prev,
                    action_config: { ...prev.action_config, stage_id: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma etapa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines.find((p: any) => p.id === newAutomation.action_config.pipeline_id)?.stages?.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Título do Negócio (template)</Label>
              <Input
                value={newAutomation.action_config.deal_title_template || ''}
                onChange={(e) => setNewAutomation(prev => ({
                  ...prev,
                  action_config: { ...prev.action_config, deal_title_template: e.target.value }
                }))}
                placeholder="Ex: Lead - {{first_name}}"
              />
            </div>
          </div>
        );
      case 'create_ticket':
        return (
          <div className="space-y-3">
            <div>
              <Label>Título do Ticket (template)</Label>
              <Input
                value={newAutomation.action_config.ticket_title_template || ''}
                onChange={(e) => setNewAutomation(prev => ({
                  ...prev,
                  action_config: { ...prev.action_config, ticket_title_template: e.target.value }
                }))}
                placeholder="Ex: Solicitação de {{first_name}}"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prioridade</Label>
                <Select
                  value={newAutomation.action_config.ticket_priority || 'medium'}
                  onValueChange={(value) => setNewAutomation(prev => ({
                    ...prev,
                    action_config: { ...prev.action_config, ticket_priority: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Departamento</Label>
                <Select
                  value={newAutomation.action_config.ticket_department_id || ''}
                  onValueChange={(value) => setNewAutomation(prev => ({
                    ...prev,
                    action_config: { ...prev.action_config, ticket_department_id: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );
      case 'add_tag':
        return (
          <div>
            <Label>Tag</Label>
            <Select
              value={newAutomation.action_config.tag_id || ''}
              onValueChange={(value) => setNewAutomation(prev => ({
                ...prev,
                action_config: { ...prev.action_config, tag_id: value }
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma tag..." />
              </SelectTrigger>
              <SelectContent>
                {tags.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                      {t.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 'webhook':
        return (
          <div className="space-y-3">
            <div>
              <Label>URL do Webhook</Label>
              <Input
                value={newAutomation.action_config.webhook_url || ''}
                onChange={(e) => setNewAutomation(prev => ({
                  ...prev,
                  action_config: { ...prev.action_config, webhook_url: e.target.value }
                }))}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Método HTTP</Label>
              <Select
                value={newAutomation.action_config.webhook_method || 'POST'}
                onValueChange={(value: any) => setNewAutomation(prev => ({
                  ...prev,
                  action_config: { ...prev.action_config, webhook_method: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 'update_contact':
        return (
          <div className="space-y-3">
            <div>
              <Label>Campo do Contato</Label>
              <Select
                value={newAutomation.action_config.contact_field || ''}
                onValueChange={(value) => setNewAutomation(prev => ({
                  ...prev,
                  action_config: { ...prev.action_config, contact_field: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="source">Origem</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="company">Empresa</SelectItem>
                  <SelectItem value="subscription_plan">Plano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Novo Valor (template)</Label>
              <Input
                value={newAutomation.action_config.contact_value_template || ''}
                onChange={(e) => setNewAutomation(prev => ({
                  ...prev,
                  action_config: { ...prev.action_config, contact_value_template: e.target.value }
                }))}
                placeholder="Ex: {{campo_origem}}"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };
  
  if (isLoading) {
    return <div className="text-center p-8 text-muted-foreground">Carregando automações...</div>;
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Automações</h3>
          <Badge variant="secondary">{automations.length}</Badge>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Automação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>
                Nova Automação - Passo {step} de 3
              </DialogTitle>
            </DialogHeader>
            
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label>Nome da Automação</Label>
                  <Input
                    value={newAutomation.name}
                    onChange={(e) => setNewAutomation(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Qualificar leads quentes"
                  />
                </div>
                <div>
                  <Label>Quando disparar?</Label>
                  <Select
                    value={newAutomation.trigger_type}
                    onValueChange={(value: TriggerType) => setNewAutomation(prev => ({ 
                      ...prev, 
                      trigger_type: value,
                      trigger_config: {}
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on_submit">Ao Enviar Formulário</SelectItem>
                      <SelectItem value="on_field_change">Ao Alterar Campo</SelectItem>
                      <SelectItem value="on_score_threshold">Quando Score Atingir Valor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {renderTriggerConfig()}
                <div className="flex justify-end">
                  <Button onClick={() => setStep(2)} disabled={!newAutomation.name}>
                    Próximo
                  </Button>
                </div>
              </div>
            )}
            
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label>Qual ação executar?</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {(['start_playbook', 'send_email', 'create_deal', 'create_ticket', 'add_tag', 'webhook', 'update_contact'] as ActionType[]).map(action => (
                      <Button
                        key={action}
                        variant={newAutomation.action_type === action ? 'default' : 'outline'}
                        className="justify-start gap-2"
                        onClick={() => setNewAutomation(prev => ({ 
                          ...prev, 
                          action_type: action,
                          action_config: {}
                        }))}
                      >
                        {ACTION_ICONS[action]}
                        {getActionTypeLabel(action)}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
                  <Button onClick={() => setStep(3)}>Próximo</Button>
                </div>
              </div>
            )}
            
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  {ACTION_ICONS[newAutomation.action_type]}
                  <span className="font-medium">{getActionTypeLabel(newAutomation.action_type)}</span>
                </div>
                {renderActionConfig()}
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
                  <Button onClick={handleCreate} disabled={createAutomation.isPending}>
                    Criar Automação
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      
      {automations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Nenhuma automação configurada. Crie ações automáticas baseadas nas respostas.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Automação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {automations.map(auto => (
            <Card key={auto.id} className={!auto.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      {ACTION_ICONS[auto.action_type]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{auto.name}</span>
                        {!auto.is_active && <Badge variant="secondary">Inativa</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getTriggerTypeLabel(auto.trigger_type)} → {getActionTypeLabel(auto.action_type)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={auto.is_active}
                      onCheckedChange={(checked) => handleToggle(auto.id, checked)}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive"
                      onClick={() => handleDelete(auto.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
