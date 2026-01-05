import { useState, useEffect } from "react";
import { Search, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useUsers } from "@/hooks/useUsers";
import { useTeams, useTeamMembers, useUpdateTeamMembers } from "@/hooks/useTeams";

interface TeamMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
}

export default function TeamMembersDialog({ open, onOpenChange, teamId }: TeamMembersDialogProps) {
  const { data: users } = useUsers();
  const { data: teams } = useTeams();
  const { data: currentMembers } = useTeamMembers(teamId);
  const updateMembers = useUpdateTeamMembers();
  
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const team = teams?.find(t => t.id === teamId);

  useEffect(() => {
    if (currentMembers) {
      setSelectedMembers(currentMembers.map(m => m.user_id));
    }
  }, [currentMembers]);

  // Filter only operational users (not customers)
  const operationalUsers = users?.filter(u => 
    ["sales_rep", "consultant", "support_agent", "support_manager", "cs_manager", "admin", "manager", "general_manager", "financial_manager"].includes(u.role)
  );

  const filteredUsers = operationalUsers?.filter(user => {
    const searchLower = search.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.job_title?.toLowerCase().includes(searchLower)
    );
  });

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSave = async () => {
    await updateMembers.mutateAsync({ teamId, memberIds: selectedMembers });
    onOpenChange(false);
  };

  const getRoleBadge = (role: string) => {
    const roleLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      admin: { label: "Admin", variant: "default" },
      manager: { label: "Gerente", variant: "default" },
      general_manager: { label: "GM", variant: "default" },
      support_manager: { label: "Ger. Suporte", variant: "secondary" },
      cs_manager: { label: "Ger. CS", variant: "secondary" },
      sales_rep: { label: "Vendedor", variant: "outline" },
      consultant: { label: "Consultor", variant: "outline" },
      support_agent: { label: "Suporte", variant: "outline" },
      financial_manager: { label: "Financeiro", variant: "secondary" },
      financial_agent: { label: "Ag. Fin.", variant: "outline" },
    };
    const config = roleLabels[role] || { label: role, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded"
              style={{ backgroundColor: team?.color || "#3B82F6" }}
            />
            Gerenciar Membros - {team?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuários..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="text-sm text-muted-foreground">
            {selectedMembers.length} membros selecionados
          </div>

          <ScrollArea className="h-[400px] border rounded-lg">
            <div className="p-2 space-y-1">
              {filteredUsers?.map((user) => {
                const isSelected = selectedMembers.includes(user.id);
                return (
                  <div
                    key={user.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
                    }`}
                    onClick={() => toggleMember(user.id)}
                  >
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => toggleMember(user.id)}
                    />
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>
                        {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {user.full_name || user.email}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {user.job_title || user.email}
                      </p>
                    </div>
                    {getRoleBadge(user.role)}
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                );
              })}

              {filteredUsers?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateMembers.isPending}>
            {updateMembers.isPending ? "Salvando..." : "Salvar Membros"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
