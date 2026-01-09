import { useState, useEffect } from "react";
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
import { useSalesReps } from "@/hooks/useSalesReps";
import { useBulkTransferSelectedDeals } from "@/hooks/useBulkTransferSelectedDeals";
import { supabase } from "@/integrations/supabase/client";
import { Users, ArrowRight } from "lucide-react";

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

  const { data: salesReps } = useSalesReps();
  const bulkTransfer = useBulkTransferSelectedDeals();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setToUserId("");
      setKeepHistory(true);
      
      // Fetch total value of selected deals
      const fetchTotalValue = async () => {
        const { data } = await supabase
          .from("deals")
          .select("value")
          .in("id", selectedDealIds);
        
        if (data) {
          setTotalValue(data.reduce((sum, d) => sum + (d.value || 0), 0));
        }
      };
      
      if (selectedDealIds.length > 0) {
        fetchTotalValue();
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

          {/* Target Seller */}
          <div className="space-y-2">
            <Label htmlFor="toUser">Transferir para</Label>
            <Select value={toUserId} onValueChange={setToUserId}>
              <SelectTrigger id="toUser">
                <SelectValue placeholder="Selecione o vendedor destino" />
              </SelectTrigger>
              <SelectContent>
                {salesReps?.map((rep) => (
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
