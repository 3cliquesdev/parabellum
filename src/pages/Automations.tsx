import { useState } from "react";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useAutomations } from "@/hooks/useAutomations";
import { useDeleteAutomation } from "@/hooks/useDeleteAutomation";
import { useToggleAutomation } from "@/hooks/useToggleAutomation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AutomationDialog } from "@/components/AutomationDialog";
import { Zap, Trash2, Pencil, Plus, Loader2, Shield } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Automations() {
  const { hasPermission, loading: permLoading } = useRolePermissions();
  const { data: automations, isLoading } = useAutomations();
  const deleteMutation = useDeleteAutomation();
  const toggleMutation = useToggleAutomation();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [automationToDelete, setAutomationToDelete] = useState<string | null>(null);

  if (permLoading || isLoading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasPermission("automations.view")) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  const handleEdit = (automation: any) => {
    setEditingAutomation(automation);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setAutomationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (automationToDelete) {
      deleteMutation.mutate(automationToDelete);
    }
    setDeleteDialogOpen(false);
    setAutomationToDelete(null);
  };

  const handleToggle = (id: string, currentStatus: boolean) => {
    toggleMutation.mutate({ id, is_active: !currentStatus });
  };

  const getTriggerLabel = (trigger: string) => {
    const labels: Record<string, string> = {
      deal_created: "Negócio Criado",
      deal_won: "Negócio Ganho",
      deal_lost: "Negócio Perdido",
      deal_stage_changed: "Etapa Alterada",
      activity_overdue: "Atividade Vencida",
      contact_created: "Contato Criado",
      contact_inactive: "Contato Inativo",
    };
    return labels[trigger] || trigger;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      assign_to_user: "Atribuir Vendedor",
      create_activity: "Criar Atividade",
      add_tag: "Adicionar Tag",
      send_notification: "Enviar Notificação",
      change_status: "Mudar Status",
    };
    return labels[action] || action;
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            Automações e Workflows
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure automações inteligentes para otimizar seu processo de vendas
          </p>
        </div>
        <Button onClick={() => { setEditingAutomation(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Automação
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {automations && automations.length > 0 ? (
          automations.map((automation) => (
            <Card key={automation.id} className={automation.is_active ? "border-primary/30" : "opacity-60"}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {automation.name}
                      {automation.is_active && (
                        <Badge variant="default" className="bg-green-500">Ativa</Badge>
                      )}
                      {!automation.is_active && (
                        <Badge variant="secondary">Inativa</Badge>
                      )}
                    </CardTitle>
                    {automation.description && (
                      <CardDescription className="mt-2">{automation.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={automation.is_active}
                      onCheckedChange={() => handleToggle(automation.id, automation.is_active)}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(automation)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(automation.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    Gatilho: {getTriggerLabel(automation.trigger_event)}
                  </Badge>
                  <Badge variant="outline">
                    Ação: {getActionLabel(automation.action_type)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Zap className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma automação criada</h3>
              <p className="text-muted-foreground mb-4">
                Crie sua primeira automação para otimizar seu processo de vendas
              </p>
              <Button onClick={() => { setEditingAutomation(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Automação
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AutomationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        automation={editingAutomation}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A automação será permanentemente deletada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
