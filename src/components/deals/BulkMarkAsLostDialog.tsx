import { useState, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, XCircle } from "lucide-react";
import { useBulkMarkDealsAsLost } from "@/hooks/useBulkMarkDealsAsLost";
import { useDeals } from "@/hooks/useDeals";

const LOST_REASONS = [
  { value: "nunca_respondeu", label: "Nunca respondeu" },
  { value: "parou_interagir", label: "Parou de interagir" },
  { value: "contato_invalido", label: "Contato inválido" },
  { value: "compra_futura", label: "Compra futura" },
  { value: "preco", label: "Preço" },
  { value: "nicho_fora_catalogo", label: "Nicho de interesse fora do catálogo" },
  { value: "prazo_importacao", label: "Prazo de importação" },
  { value: "confianca_geral", label: "Confiança na marca - geral" },
  { value: "confianca_entrega", label: "Confiança na marca - entrega" },
  { value: "confianca_redes", label: "Confiança na marca - reputação redes sociais" },
  { value: "investimento_hibrido", label: "Investimento para o híbrido" },
  { value: "fora_momento", label: "Fora do momento de compra" },
  { value: "desistiu_queda_vendas", label: "Desistiu da compra - queda de vendas" },
  { value: "ja_comprou_duplicidade", label: "Já comprou/Duplicidade" },
  { value: "sem_interesse_produto", label: "Não tinha interesse em nenhum produto" },
  { value: "sem_interesse_dropshipping", label: "Não tinha interesse em fazer dropshipping" },
  { value: "reembolsado", label: "Reembolsado" },
  { value: "estorno", label: "Estorno/Chargeback" },
  { value: "migracao_pagamento_anterior", label: "Migração (pagamento anterior)" },
  { value: "outro", label: "Outro" },
];

interface BulkMarkAsLostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDealIds: string[];
  pipelineId: string;
  onSuccess: () => void;
}

export function BulkMarkAsLostDialog({
  open,
  onOpenChange,
  selectedDealIds,
  pipelineId,
  onSuccess,
}: BulkMarkAsLostDialogProps) {
  const [lostReason, setLostReason] = useState("");
  const [notes, setNotes] = useState("");
  const [keepHistory, setKeepHistory] = useState(true);
  
  const bulkMarkAsLost = useBulkMarkDealsAsLost();
  const { data: allDeals } = useDeals(pipelineId);

  // Calculate total value of selected deals
  const selectedDealsInfo = useMemo(() => {
    if (!allDeals) return { count: selectedDealIds.length, totalValue: 0 };
    
    const selectedDeals = allDeals.filter(d => selectedDealIds.includes(d.id));
    const totalValue = selectedDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    
    return { count: selectedDeals.length, totalValue };
  }, [allDeals, selectedDealIds]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleConfirm = async () => {
    if (!lostReason) return;

    await bulkMarkAsLost.mutateAsync({
      dealIds: selectedDealIds,
      lostReason,
      notes: notes.trim() || undefined,
      keepHistory,
    });

    // Reset form
    setLostReason("");
    setNotes("");
    setKeepHistory(true);
    
    onOpenChange(false);
    onSuccess();
  };

  const handleClose = () => {
    setLostReason("");
    setNotes("");
    setKeepHistory(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Marcar como Perdido
          </DialogTitle>
          <DialogDescription>
            Esta ação irá marcar os negócios selecionados como perdidos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary Card */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-sm">
                {selectedDealsInfo.count} negócio{selectedDealsInfo.count > 1 ? "s" : ""} selecionado{selectedDealsInfo.count > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Valor total: {formatCurrency(selectedDealsInfo.totalValue)}
              </p>
            </div>
          </div>

          {/* Lost Reason Select */}
          <div className="space-y-2">
            <Label htmlFor="lostReason">
              Motivo da Perda <span className="text-destructive">*</span>
            </Label>
            <Select value={lostReason} onValueChange={setLostReason}>
              <SelectTrigger id="lostReason">
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {LOST_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes Field */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Adicione uma observação sobre esta ação..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Keep History Checkbox */}
          <div className="flex items-start space-x-3 pt-2">
            <Checkbox
              id="keepHistory"
              checked={keepHistory}
              onCheckedChange={(checked) => setKeepHistory(checked as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="keepHistory"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Manter histórico
              </label>
              <p className="text-xs text-muted-foreground">
                Registra esta ação no timeline de cada contato para remarketing futuro.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!lostReason || bulkMarkAsLost.isPending}
          >
            {bulkMarkAsLost.isPending ? "Processando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
