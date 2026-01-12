import { useState, useEffect, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAvailableSalesReps } from "@/hooks/useAvailableSalesReps";
import { useBulkTransferSelectedDeals } from "@/hooks/useBulkTransferSelectedDeals";
import { supabase } from "@/integrations/supabase/client";
import { Users, ArrowRight, AlertTriangle } from "lucide-react";

interface BulkTransferToSellerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDealIds: string[];
  onSuccess?: () => void;
}

export default function BulkTransferToSellerDialog({
  open,
  onOpenChange,
  selectedDealIds,
  onSuccess,
}: BulkTransferToSellerDialogProps) {
  const [toUserId, setToUserId] = useState<string>("");
  const [keepHistory, setKeepHistory] = useState(true);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [dealsPipelineId, setDealsPipelineId] = useState<string | undefined>(undefined);

  // Fetch pipeline info from selected deals to filter reps
  const { availableReps, hasPipelineTeam, isLoading: repsLoading } = useAvailableSalesReps(dealsPipelineId);
  const bulkTransfer = useBulkTransferSelectedDeals();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setToUserId("");
      setKeepHistory(true);
      
      // Fetch total value and pipeline_id of selected deals
      const fetchDealsInfo = async () => {
        const { data } = await supabase
          .from("deals")
          .select("value, pipeline_id")
          .in("id", selectedDealIds);
        
        if (data) {
          setTotalValue(data.reduce((sum, d) => sum + (d.value || 0), 0));
          
          // Check if all deals are from the same pipeline
          const uniquePipelines = [...new Set(data.map(d => d.pipeline_id))];
          if (uniquePipelines.length === 1) {
            setDealsPipelineId(uniquePipelines[0]);
          } else {
            setDealsPipelineId(undefined); // Multiple pipelines, show all reps
          }
        }
      };
      
      if (selectedDealIds.length > 0) {
        fetchDealsInfo();
      }
    }
  }, [open, selectedDealIds]);

  const handleTransfer = async () => {
    if (!toUserId || selectedDealIds.length === 0) return;

    await bulkTransfer.mutateAsync({
      dealIds: selectedDealIds,
      toUserId,
      keepHistory,
    });

    onOpenChange(false);
    onSuccess?.();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Transferir para Vendedor
          </DialogTitle>
          <DialogDescription>
            Transferir {selectedDealIds.length} negócio{selectedDealIds.length > 1 ? "s" : ""} selecionado{selectedDealIds.length > 1 ? "s" : ""} para outro vendedor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preview */}
          <Alert>
            <AlertDescription className="flex items-center justify-between">
              <span className="font-medium">
                {selectedDealIds.length} negócio{selectedDealIds.length > 1 ? "s" : ""}
              </span>
              <span className="text-primary font-semibold">
                {formatCurrency(totalValue)}
              </span>
            </AlertDescription>
          </Alert>

          {/* Pipeline team warning */}
          {hasPipelineTeam && (
            <div className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-blue-600 dark:text-blue-400">
                Mostrando apenas vendedores da equipe do pipeline
              </span>
            </div>
          )}

          {/* No team warning */}
          {dealsPipelineId && !hasPipelineTeam && availableReps.length === 0 && !repsLoading && (
            <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-amber-600 dark:text-amber-400">
                Nenhum vendedor configurado para este pipeline
              </span>
            </div>
          )}

          {/* Target Seller */}
          <div className="space-y-2">
            <Label htmlFor="toUser">Transferir para</Label>
            <Select 
              value={toUserId} 
              onValueChange={setToUserId}
              disabled={repsLoading || availableReps.length === 0}
            >
              <SelectTrigger id="toUser">
                <SelectValue placeholder={
                  repsLoading ? "Carregando..." : 
                  availableReps.length === 0 ? "Nenhum vendedor disponível" :
                  "Selecione o vendedor destino"
                } />
              </SelectTrigger>
              <SelectContent>
                {availableReps.map((rep) => (
                  <SelectItem key={rep.id} value={rep.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={rep.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(rep.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{rep.full_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Keep History */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="keepHistory"
              checked={keepHistory}
              onCheckedChange={(checked) => setKeepHistory(checked === true)}
            />
            <Label htmlFor="keepHistory" className="text-sm cursor-pointer">
              Registrar transferência na timeline
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!toUserId || bulkTransfer.isPending}
            className="gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            {bulkTransfer.isPending ? "Transferindo..." : "Transferir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
