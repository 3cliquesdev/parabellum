import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateSavedTicketFilter } from "@/hooks/useSavedTicketFilters";
import { TicketFilters } from "./TicketFilterPopover";
import { Loader2 } from "lucide-react";

interface SaveTicketFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: TicketFilters;
}

export function SaveTicketFilterDialog({ open, onOpenChange, filters }: SaveTicketFilterDialogProps) {
  const [name, setName] = useState("");
  const createFilter = useCreateSavedTicketFilter();

  const handleSave = () => {
    if (!name.trim()) return;
    
    createFilter.mutate(
      { name: name.trim(), filters },
      {
        onSuccess: () => {
          setName("");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar Filtro Personalizado</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="filter-name">Nome do filtro</Label>
            <Input
              id="filter-name"
              placeholder="Ex: Tickets Pendentes, Urgentes do Mês..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
          </div>
          
          <div className="text-sm text-muted-foreground">
            Este filtro salvará os critérios atuais de busca, status, prioridade, departamento e outros filtros aplicados.
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!name.trim() || createFilter.isPending}
          >
            {createFilter.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Filtro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
