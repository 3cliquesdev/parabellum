import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { LogOut } from "lucide-react";

const menuItems: Record<string, { title: string; items: { label: string; value: string }[] }> = {
  "/": {
    title: "Dashboard",
    items: [
      { label: "Visão Geral", value: "overview" },
      { label: "Financeiro", value: "financial" },
      { label: "Convidados", value: "guests" },
    ],
  },
  "/inbox": {
    title: "Caixa de Entrada",
    items: [
      { label: "Todas", value: "all" },
      { label: "Não Lidas", value: "unread" },
      { label: "Arquivadas", value: "archived" },
    ],
  },
  "/contacts": {
    title: "Contatos",
    items: [
      { label: "Todos", value: "all" },
      { label: "Ativos", value: "active" },
      { label: "Inativos", value: "inactive" },
    ],
  },
  "/organizations": {
    title: "Organizações",
    items: [
      { label: "Todas", value: "all" },
      { label: "Parceiras", value: "partners" },
    ],
  },
  "/deals": {
    title: "Negócios",
    items: [
      { label: "Abertos", value: "open" },
      { label: "Ganhos", value: "won" },
      { label: "Perdidos", value: "lost" },
    ],
  },
  "/forms": {
    title: "Formulários",
    items: [
      { label: "Ativos", value: "active" },
      { label: "Inativos", value: "inactive" },
    ],
  },
  "/users": {
    title: "Usuários",
    items: [
      { label: "Todos", value: "all" },
      { label: "Admins", value: "admins" },
    ],
  },
};

export function ContextualMenu() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  
  const currentMenu = menuItems[location.pathname] || menuItems["/"];

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/auth");
  };

  return (
    <aside className="w-64 bg-muted border-r border-border flex flex-col">
      {/* Menu Header */}
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-bold text-foreground">{currentMenu.title}</h2>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {currentMenu.items.map((item) => (
            <button
              key={item.value}
              className={cn(
                "w-full text-left px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200",
                "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-border">
        <div className="mb-3 px-4">
          <p className="text-xs font-medium text-foreground truncate mb-1">
            Usuário
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {user?.email}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground rounded-2xl"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
