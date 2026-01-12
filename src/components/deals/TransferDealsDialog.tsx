import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRightLeft, Loader2, AlertCircle, Users, AlertTriangle } from "lucide-react";
import { useAvailableSalesReps } from "@/hooks/useAvailableSalesReps";
import { usePipelines } from "@/hooks/usePipelines";
import { useBulkTransferDeals, useTransferPreview } from "@/hooks/useBulkTransferDeals";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TransferDealsDialogProps {
  trigger?: React.ReactNode;
}

export function TransferDealsDialog({ trigger }: TransferDealsDialogProps) {
  const [open, setOpen] = useState(false);
  const [fromUserId, setFromUserId] = useState<string>("");
  const [toUserId, setToUserId] = useState<string>("");
  const [pipelineId, setPipelineId] = useState<string>("__all__");
  const [keepHistory, setKeepHistory] = useState(true);
  const [preview, setPreview] = useState({ count: 0, totalValue: 0 });
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Use pipeline-filtered reps when a specific pipeline is selected
  const activePipelineId = pipelineId === "__all__" ? undefined : pipelineId;
  const { availableReps, hasPipelineTeam, isLoading: repsLoading } = useAvailableSalesReps(activePipelineId);
  const { data: pipelines } = usePipelines();
  const transferMutation = useBulkTransferDeals();
  const { getPreview } = useTransferPreview();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setFromUserId("");
      setToUserId("");
      setPipelineId("__all__");
      setKeepHistory(true);
      setPreview({ count: 0, totalValue: 0 });
    }
  }, [open]);

  // Update preview when fromUserId or pipelineId changes
  useEffect(() => {
    const fetchPreview = async () => {
      if (!fromUserId) {
        setPreview({ count: 0, totalValue: 0 });
        return;
      }

      setLoadingPreview(true);
      try {
        const result = await getPreview(
          fromUserId,
          pipelineId === "__all__" ? undefined : pipelineId
        );
        setPreview(result);
      } catch (error) {
        console.error("Error fetching preview:", error);
        setPreview({ count: 0, totalValue: 0 });
      } finally {
        setLoadingPreview(false);
      }
    };

    fetchPreview();
  }, [fromUserId, pipelineId]);

  // Filter out selected "from" user from "to" options (using pipeline-filtered reps)
  const availableTargets = availableReps.filter((rep) => rep.id !== fromUserId);

  const handleTransfer = async () => {
    if (!fromUserId || !toUserId) return;

    await transferMutation.mutateAsync({
      fromUserId,
      toUserId,
      pipelineId: pipelineId === "__all__" ? undefined : pipelineId,
      keepHistory,
    });

    setOpen(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const fromUser = availableReps.find((r) => r.id === fromUserId);
  const toUser = availableReps.find((r) => r.id === toUserId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Transferir Carteira
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transferir Carteira
          </DialogTitle>
          <DialogDescription>
            Transfere todos os deals abertos de um vendedor para outro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Pipeline team info */}
          {activePipelineId && hasPipelineTeam && (
            <div className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-blue-600 dark:text-blue-400">
                Filtrando vendedores da equipe do pipeline selecionado
              </span>
            </div>
          )}

          {activePipelineId && !hasPipelineTeam && availableReps.length === 0 && !repsLoading && (
            <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-amber-600 dark:text-amber-400">
                Nenhum vendedor configurado para este pipeline
              </span>
            </div>
          )}

          {/* From User */}
          <div className="space-y-2">
            <Label>De (origem)</Label>
            <Select 
              value={fromUserId} 
              onValueChange={setFromUserId}
              disabled={repsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={repsLoading ? "Carregando..." : "Selecione o vendedor origem"} />
              </SelectTrigger>
              <SelectContent>
                {availableReps.map((rep) => (
                  <SelectItem key={rep.id} value={rep.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={rep.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(rep.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{rep.full_name}</span>
                    </div>
                  </SelectItem>
                ))}</SelectContent>
            </Select>
          </div>

          {/* To User */}
          <div className="space-y-2">
            <Label>Para (destino)</Label>
            <Select
              value={toUserId}
              onValueChange={setToUserId}
              disabled={!fromUserId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o vendedor destino" />
              </SelectTrigger>
              <SelectContent>
                {availableTargets.map((rep) => (
                  <SelectItem key={rep.id} value={rep.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={rep.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(rep.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{rep.full_name}</span>
                    </div>
                  </SelectItem>
                ))}</SelectContent>
            </Select>
          </div>

          {/* Pipeline Filter (optional) */}
          <div className="space-y-2">
            <Label>Pipeline (opcional)</Label>
            <Select value={pipelineId} onValueChange={setPipelineId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os pipelines</SelectItem>
                {pipelines?.map((pipeline) => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </SelectItem>
                ))}</SelectContent>
            </Select>
          </div>

          {/* Preview */}
          {fromUserId && (
            <Alert
              variant={preview.count > 0 ? "default" : "destructive"}
              className="bg-muted/50"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {loadingPreview ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Calculando...
                  </span>
                ) : preview.count > 0 ? (
                  <>
                    <strong>{preview.count}</strong> deal
                    {preview.count > 1 ? "s" : ""} aberto
                    {preview.count > 1 ? "s" : ""} serão transferidos
                    {preview.totalValue > 0 && (
                      <> (total: {formatCurrency(preview.totalValue)})</>
                    )}
                  </>
                ) : (
                  "Nenhum deal aberto encontrado para este vendedor"
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Keep History Toggle */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="keepHistory"
              checked={keepHistory}
              onCheckedChange={(checked) => setKeepHistory(checked === true)}
            />
            <Label htmlFor="keepHistory" className="cursor-pointer text-sm">
              Registrar na timeline dos deals
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={
              !fromUserId ||
              !toUserId ||
              preview.count === 0 ||
              transferMutation.isPending
            }
          >
            {transferMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transferindo...
              </>
            ) : (
              <>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Transferir {preview.count > 0 && `(${preview.count})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
