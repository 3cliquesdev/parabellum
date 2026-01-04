import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Play, Pause, Users, CheckCircle, MessageSquare, UserPlus, Pencil, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCadences } from "@/hooks/useCadences";
import { useUpdateCadence } from "@/hooks/useUpdateCadence";
import { useDeleteCadence } from "@/hooks/useDeleteCadence";
import { useCadenceEnrollments } from "@/hooks/useCadenceEnrollments";
import { CadenceEnrollDialog } from "@/components/CadenceEnrollDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { Progress } from "@/components/ui/progress";
import { CadenceDashboard } from "@/components/cadences/CadenceDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Cadences() {
  const navigate = useNavigate();
  const { data: cadences, isLoading } = useCadences();
  const { mutate: updateCadence } = useUpdateCadence();
  const { mutate: deleteCadence } = useDeleteCadence();
  const [enrollDialogCadence, setEnrollDialogCadence] = useState<{ id: string; name: string } | null>(null);
  const { isAdmin, isManager, isGeneralManager } = useUserRole();
  
  const canManage = isAdmin || isManager || isGeneralManager;

  const handleToggleActive = (cadence: any) => {
    updateCadence({
      id: cadence.id,
      is_active: !cadence.is_active,
    });
  };

  const handleEdit = (cadence: any) => {
    navigate(`/cadences/${cadence.id}/edit`);
  };

  const handleCreate = () => {
    navigate("/cadences/new/edit");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando cadências...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">🔄 Cadências de Prospecção</h1>
          <p className="text-muted-foreground mt-1">
            Automatize seu follow-up multi-canal e organize sua rotina de vendas
          </p>
        </div>
        {canManage && (
          <Button onClick={handleCreate} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Nova Cadência
          </Button>
        )}
      </div>

      {/* Tabs for Dashboard and List */}
      <Tabs defaultValue="list" className="space-y-6">
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Cadências
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <CadenceDashboard cadences={cadences || []} />
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Cadências</CardTitle>
                <Play className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cadences?.length || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ativas</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {cadences?.filter((c) => c.is_active).length || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pausadas</CardTitle>
                <Pause className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {cadences?.filter((c) => !c.is_active).length || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Inscritos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">Em todas as cadências</p>
              </CardContent>
            </Card>
          </div>

      {/* Cadences List */}
      <div className="space-y-4">
        {cadences?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma cadência criada</h3>
              <p className="text-muted-foreground text-center mb-4">
                Crie sua primeira cadência para automatizar o follow-up de leads
              </p>
              {canManage && (
                <Button onClick={handleCreate} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Primeira Cadência
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          cadences?.map((cadence) => (
            <CadenceCard
              key={cadence.id}
              cadence={cadence}
              onEdit={handleEdit}
              onToggleActive={handleToggleActive}
              onDelete={deleteCadence}
              onEnroll={() => setEnrollDialogCadence({ id: cadence.id, name: cadence.name })}
              canManage={canManage}
            />
          ))
        )}
        </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CadenceEnrollDialog
        cadence={enrollDialogCadence}
        open={!!enrollDialogCadence}
        onOpenChange={(open) => !open && setEnrollDialogCadence(null)}
      />
    </div>
  );
}

interface CadenceCardProps {
  cadence: any;
  onEdit: (cadence: any) => void;
  onToggleActive: (cadence: any) => void;
  onDelete: (id: string) => void;
  onEnroll: () => void;
  canManage: boolean;
}

function CadenceCard({ cadence, onEdit, onToggleActive, onDelete, onEnroll, canManage }: CadenceCardProps) {
  const { data: enrollments } = useCadenceEnrollments({ cadenceId: cadence.id });
  
  const activeEnrollments = enrollments?.filter((e) => e.status === "active").length || 0;
  const repliedEnrollments = enrollments?.filter((e) => e.status === "replied").length || 0;
  const completedEnrollments = enrollments?.filter((e) => e.status === "completed").length || 0;
  const totalEnrollments = enrollments?.length || 0;

  const responseRate = totalEnrollments > 0 ? Math.round((repliedEnrollments / totalEnrollments) * 100) : 0;
  const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

  return (
    <Card className={`transition-all hover:shadow-md ${!cadence.is_active ? "opacity-60" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{cadence.name}</CardTitle>
              <Badge variant={cadence.is_active ? "default" : "secondary"}>
                {cadence.is_active ? "✅ Ativa" : "⏸️ Pausada"}
              </Badge>
            </div>
            {cadence.description && (
              <CardDescription>{cadence.description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Performance Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Inscritos</span>
            </div>
            <div className="text-2xl font-bold">{totalEnrollments}</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Play className="h-4 w-4 text-blue-500" />
              <span>Ativos</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{activeEnrollments}</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4 text-green-500" />
              <span>Responderam</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{repliedEnrollments}</div>
            <div className="flex items-center gap-2">
              <Progress value={responseRate} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground">{responseRate}%</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-gray-500" />
              <span>Concluídos</span>
            </div>
            <div className="text-2xl font-bold text-gray-600">{completedEnrollments}</div>
            <div className="flex items-center gap-2">
              <Progress value={completionRate} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground">{completionRate}%</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {canManage && (
          <div className="flex flex-wrap gap-2 pt-3 border-t">
            <Button onClick={onEnroll} variant="default" size="sm" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Inscrever Contatos
            </Button>
            <Button onClick={() => onEdit(cadence)} variant="outline" size="sm" className="gap-2">
              <Pencil className="h-4 w-4" />
              Editor Visual
            </Button>
            <Button
              onClick={() => onToggleActive(cadence)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {cadence.is_active ? (
                <>
                  <Pause className="h-4 w-4" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Ativar
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                if (confirm("Tem certeza que deseja deletar esta cadência?")) {
                  onDelete(cadence.id);
                }
              }}
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
            >
              Deletar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
