import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Phone, Users, Mail, CheckSquare, Utensils, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActivities } from "@/hooks/useActivities";
import { useUpdateActivity } from "@/hooks/useUpdateActivity";
import { useDeleteActivity } from "@/hooks/useDeleteActivity";
import ActivityDialog from "./ActivityDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ActivitiesListProps {
  contactId: string;
}

const activityTypeIcons = {
  call: Phone,
  meeting: Users,
  email: Mail,
  task: CheckSquare,
  lunch: Utensils,
};

const activityTypeLabels = {
  call: "Ligação",
  meeting: "Reunião",
  email: "Email",
  task: "Tarefa",
  lunch: "Almoço",
};

const activityTypeColors = {
  call: "bg-blue-500",
  meeting: "bg-purple-500",
  email: "bg-green-500",
  task: "bg-orange-500",
  lunch: "bg-pink-500",
};

export default function ActivitiesList({ contactId }: ActivitiesListProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const { data: activities, isLoading } = useActivities({ 
    contactId,
    completed: filter === "pending" ? false : filter === "completed" ? true : undefined
  });
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();

  const handleToggleComplete = async (activityId: string, currentStatus: boolean) => {
    await updateActivity.mutateAsync({
      id: activityId,
      completed: !currentStatus,
    });
  };

  const handleDelete = async (activityId: string) => {
    await deleteActivity.mutateAsync(activityId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Atividades Agendadas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  const now = new Date();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividades Agendadas</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
            <TabsTrigger value="completed">Concluídas</TabsTrigger>
          </TabsList>
          
          <TabsContent value={filter} className="space-y-3">
            {!activities || activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {filter === "pending" ? "Nenhuma atividade pendente" : 
                 filter === "completed" ? "Nenhuma atividade concluída" :
                 "Nenhuma atividade agendada"}
              </p>
            ) : (
              activities.map((activity) => {
                const Icon = activityTypeIcons[activity.type as keyof typeof activityTypeIcons];
                const isOverdue = !activity.completed && new Date(activity.due_date) < now;
                
                return (
                  <div
                    key={activity.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      activity.completed ? "bg-muted/50" : "bg-background"
                    } ${isOverdue ? "border-destructive" : "border-border"}`}
                  >
                    <Checkbox
                      checked={activity.completed}
                      onCheckedChange={() => handleToggleComplete(activity.id, activity.completed)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className={cn("text-white", activityTypeColors[activity.type as keyof typeof activityTypeColors])}>
                          <Icon className="h-3 w-3 mr-1" />
                          {activityTypeLabels[activity.type as keyof typeof activityTypeLabels]}
                        </Badge>
                        
                        <span className={`text-xs ${isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                          {format(new Date(activity.due_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          {isOverdue && " (Atrasada)"}
                        </span>
                      </div>
                      
                      <p className={`text-sm font-medium ${activity.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {activity.title}
                      </p>
                      
                      {activity.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-1">
                      <ActivityDialog
                        trigger={
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                        contactId={contactId}
                        activity={activity}
                      />
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja deletar esta atividade? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(activity.id)}>
                              Deletar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
