import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Plus,
  Pencil,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { EmailTemplateDialog } from "@/components/EmailTemplateDialog";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";
import { useDeleteEmailTemplate } from "@/hooks/useDeleteEmailTemplate";
import { useUserRole } from "@/hooks/useUserRole";
import type { Tables } from "@/integrations/supabase/types";
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

export default function EmailTemplates() {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const { data: templates, isLoading } = useEmailTemplates();
  const deleteMutation = useDeleteEmailTemplate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Tables<"email_templates"> | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Tables<"email_templates"> | null>(null);

  // Verificar permissão de acesso
  if (!roleLoading && role !== null && role !== 'admin' && role !== 'manager') {
    navigate('/dashboard');
    return null;
  }

  const handleEdit = (template: Tables<"email_templates">) => {
    setSelectedTemplate(template);
    setDialogOpen(true);
  };

  const handleDelete = (templateId: string) => {
    setTemplateToDelete(templateId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (templateToDelete) {
      await deleteMutation.mutateAsync(templateToDelete);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handlePreview = (template: Tables<"email_templates">) => {
    setPreviewTemplate(template);
    setPreviewDialogOpen(true);
  };

  const handleNewTemplate = () => {
    setSelectedTemplate(undefined);
    setDialogOpen(true);
  };

  const getTriggerLabel = (trigger: string | null) => {
    const labels: Record<string, string> = {
      deal_created: "Negócio Criado",
      deal_won: "Negócio Ganho",
      deal_lost: "Negócio Perdido",
      contact_created: "Contato Criado",
      contact_inactive: "Contato Inativo",
    };
    return trigger ? labels[trigger] || trigger : "—";
  };

  if (isLoading || roleLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando templates...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Templates de Email</h1>
            <p className="text-muted-foreground">
              Gerencie templates de email para automações
            </p>
          </div>
          <Button onClick={handleNewTemplate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Template
          </Button>
        </div>

        {!templates || templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Nenhum template criado</p>
              <p className="text-sm text-muted-foreground mb-4">
                Crie seu primeiro template de email para usar em automações
              </p>
              <Button onClick={handleNewTemplate}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {template.name}
                        {template.is_active ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {template.subject}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Trigger:</p>
                      <Badge variant="secondary">
                        {getTriggerLabel(template.trigger_type)}
                      </Badge>
                    </div>

                    {template.variables && Array.isArray(template.variables) && template.variables.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Variáveis:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.variables.map((variable: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {variable}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreview(template)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(template)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(template.id)}
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

      <EmailTemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={selectedTemplate}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este template? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Preview: {previewTemplate?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              Assunto: {previewTemplate?.subject}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="border rounded-lg p-4 bg-background max-h-96 overflow-y-auto">
            <div dangerouslySetInnerHTML={{ __html: previewTemplate?.html_body || "" }} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
