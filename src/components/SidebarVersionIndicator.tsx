import { useState, useEffect } from "react";
import { Info, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  getCurrentBuildId, 
  checkForUpdate, 
  forceUpdate 
} from "@/lib/build/ensureLatestBuild";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Intervalo de verificação: 60 segundos
const CHECK_INTERVAL_MS = 60 * 1000;

export function SidebarVersionIndicator() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  const buildId = getCurrentBuildId();
  
  // Formata o buildId para exibição
  const formatBuildId = (id: string) => {
    try {
      const date = new Date(id);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      }
    } catch {
      // não é uma data válida
    }
    return id.slice(0, 16);
  };
  
  // Verificar atualizações periodicamente
  useEffect(() => {
    const checkUpdate = async () => {
      const updateAvailable = await checkForUpdate();
      setHasUpdate(updateAvailable);
    };
    
    // Verificar imediatamente
    checkUpdate();
    
    // Verificar a cada 60 segundos
    const interval = setInterval(checkUpdate, CHECK_INTERVAL_MS);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleForceUpdate = async () => {
    setUpdating(true);
    toast.info("Atualizando para nova versão...");
    setTimeout(() => {
      forceUpdate();
    }, 500);
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative"
          title={hasUpdate ? "Nova versão disponível!" : `Versão: ${formatBuildId(buildId)}`}
        >
          <Info className="h-4 w-4" />
          {/* Badge de notificação quando há update */}
          {hasUpdate && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end" side="top">
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Versão atual:</span>
            <br />
            v{formatBuildId(buildId)}
          </div>
          
          {hasUpdate ? (
            <Button 
              size="sm" 
              className="w-full h-8 text-xs"
              onClick={handleForceUpdate}
              disabled={updating}
            >
              <RefreshCw className={cn("h-3 w-3 mr-1.5", updating && "animate-spin")} />
              Atualizar Agora
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              ✓ Você está na versão mais recente
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
