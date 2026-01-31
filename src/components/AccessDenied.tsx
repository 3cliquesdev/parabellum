import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { ROLE_HOME_PAGES } from "@/config/roles";

interface AccessDeniedProps {
  permission?: string;
}

/**
 * Componente de acesso negado
 * Exibido quando usuário tenta acessar uma página sem permissão
 * Substitui o redirect silencioso anterior
 */
export function AccessDenied({ permission }: AccessDeniedProps) {
  const navigate = useNavigate();
  const { role } = useUserRole();
  const homePage = role ? ROLE_HOME_PAGES[role] || "/" : "/";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md p-8">
        <ShieldX className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
        <p className="text-muted-foreground mb-6">
          Você não tem permissão para acessar esta página.
        </p>
        {permission && import.meta.env.DEV && (
          <span className="block mt-2 mb-4 text-xs font-mono bg-muted px-2 py-1 rounded">
            Permissão necessária: {permission}
          </span>
        )}
        <Button onClick={() => navigate(homePage)}>
          Ir para página inicial
        </Button>
      </div>
    </div>
  );
}
