import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2 } from "lucide-react";

interface SyncOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: SyncOptions) => void;
  isLoading?: boolean;
}

export interface SyncOptions {
  silent: boolean;
  create_auth_users: boolean;
  days_back: number;
}

export default function SyncOptionsDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: SyncOptionsDialogProps) {
  const [options, setOptions] = useState<SyncOptions>({
    silent: true,
    create_auth_users: true,
    days_back: 365,
  });

  const handleConfirm = () => {
    onConfirm(options);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>⚙️ Opções de Sincronização</DialogTitle>
          <DialogDescription>
            Configure como deseja importar o histórico de vendas da Kiwify
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Modo Silencioso */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label htmlFor="silent" className="text-base font-medium">
                🔇 Modo Silencioso
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                NÃO dispara emails de boas-vindas nem inicia playbooks automáticos.
                Recomendado para importação histórica.
              </p>
            </div>
            <Switch
              id="silent"
              checked={options.silent}
              onCheckedChange={(checked) =>
                setOptions({ ...options, silent: checked })
              }
            />
          </div>

          {/* Criar Auth Users */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label htmlFor="create_auth" className="text-base font-medium">
                🔑 Criar Acesso (auth.users)
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Cria usuários com senha temporária (CPF primeiros 5 dígitos).
                Clientes receberão email para trocar senha.
              </p>
            </div>
            <Switch
              id="create_auth"
              checked={options.create_auth_users}
              onCheckedChange={(checked) =>
                setOptions({ ...options, create_auth_users: checked })
              }
            />
          </div>

          {/* Período */}
          <div className="space-y-2">
            <Label htmlFor="period" className="text-base font-medium">
              📅 Período
            </Label>
            <Select
              value={options.days_back.toString()}
              onValueChange={(value) =>
                setOptions({ ...options, days_back: parseInt(value) })
              }
            >
              <SelectTrigger id="period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="180">Últimos 180 dias</SelectItem>
                <SelectItem value="365">Último ano (365 dias)</SelectItem>
                <SelectItem value="730">Últimos 2 anos</SelectItem>
                <SelectItem value="9999">Todos (desde o início)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Quanto mais vendas, mais tempo levará o processamento
            </p>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Atenção
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                Esta operação pode demorar vários minutos dependendo da quantidade
                de vendas. Não feche a página durante o processo.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              "🚀 Iniciar Sincronização"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}