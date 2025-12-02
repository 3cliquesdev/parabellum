import { useState } from "react";
import { Plus, Users, MoreVertical, Pencil, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useTeams, useDeleteTeam, useTeamMembers } from "@/hooks/useTeams";
import TeamDialog from "@/components/teams/TeamDialog";
import TeamMembersDialog from "@/components/teams/TeamMembersDialog";

export default function Teams() {
  const { data: teams, isLoading } = useTeams();
  const deleteTeam = useDeleteTeam();
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [managingMembersTeam, setManagingMembersTeam] = useState<string | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleDelete = () => {
    if (deletingTeam) {
      deleteTeam.mutate(deletingTeam);
      setDeletingTeam(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Times</h1>
          <p className="text-muted-foreground">Organize seus agentes em grupos de atendimento</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Time
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams?.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            onEdit={() => setEditingTeam(team.id)}
            onManageMembers={() => setManagingMembersTeam(team.id)}
            onDelete={() => setDeletingTeam(team.id)}
          />
        ))}
      </div>

      {teams?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nenhum time criado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie times para organizar seus agentes em grupos de atendimento.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Time
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <TeamDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {/* Edit Dialog */}
      {editingTeam && (
        <TeamDialog
          open={!!editingTeam}
          onOpenChange={(open) => !open && setEditingTeam(null)}
          teamId={editingTeam}
        />
      )}

      {/* Manage Members Dialog */}
      {managingMembersTeam && (
        <TeamMembersDialog
          open={!!managingMembersTeam}
          onOpenChange={(open) => !open && setManagingMembersTeam(null)}
          teamId={managingMembersTeam}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTeam} onOpenChange={(open) => !open && setDeletingTeam(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Time?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação desativará o time. Os membros serão removidos automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TeamCard({ 
  team, 
  onEdit, 
  onManageMembers, 
  onDelete 
}: { 
  team: any; 
  onEdit: () => void; 
  onManageMembers: () => void; 
  onDelete: () => void;
}) {
  const { data: members } = useTeamMembers(team.id);

  return (
    <Card className="relative overflow-hidden">
      <div 
        className="absolute top-0 left-0 w-full h-1"
        style={{ backgroundColor: team.color || "#3B82F6" }}
      />
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
            style={{ backgroundColor: team.color || "#3B82F6" }}
          >
            {team.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <CardTitle className="text-lg">{team.name}</CardTitle>
            {team.description && (
              <CardDescription className="line-clamp-1">{team.description}</CardDescription>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onManageMembers}>
              <UserPlus className="h-4 w-4 mr-2" />
              Gerenciar Membros
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar Time
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Desativar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Manager */}
          {team.manager && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Gestor:</span>
              <Avatar className="h-5 w-5">
                <AvatarImage src={team.manager.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {team.manager.full_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <span>{team.manager.full_name}</span>
            </div>
          )}

          {/* Members */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {members?.length || 0} membros
              </span>
            </div>
            <div className="flex -space-x-2">
              {members?.slice(0, 5).map((member) => (
                <Avatar key={member.id} className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={member.user?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {member.user?.full_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
              ))}
              {(members?.length || 0) > 5 && (
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                  +{members!.length - 5}
                </div>
              )}
            </div>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-2"
            onClick={onManageMembers}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Gerenciar Membros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
