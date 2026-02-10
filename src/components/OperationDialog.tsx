import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTicketOperation, useUpdateTicketOperation, type TicketOperation } from "@/hooks/useTicketOperations";

interface OperationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operation?: TicketOperation | null;
}

export default function OperationDialog({ open, onOpenChange, operation }: OperationDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3B82F6");

  const createMutation = useCreateTicketOperation();
  const updateMutation = useUpdateTicketOperation();

  useEffect(() => {
    if (operation) {
      setName(operation.name);
      setDescription(operation.description || "");
      setColor(operation.color);
    } else {
      setName("");
      setDescription("");
      setColor("#3B82F6");
    }
  }, [operation, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (operation) {
      await updateMutation.mutateAsync({ id: operation.id, name, description, color });
    } else {
      await createMutation.mutateAsync({ name, description, color });
    }
    onOpenChange(false);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{operation ? "Editar Operação" : "Nova Operação"}</DialogTitle>
          <DialogDescription>
            {operation ? "Atualize as informações da operação." : "Adicione uma nova operação para tickets."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="op-name">Nome *</Label>
              <Input id="op-name" placeholder="Ex: Suporte Técnico" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="op-desc">Descrição</Label>
              <Textarea id="op-desc" placeholder="Descreva esta operação..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="op-color">Cor</Label>
              <div className="flex gap-2">
                <Input id="op-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-20 h-10" />
                <Input type="text" value={color} onChange={(e) => setColor(e.target.value)} className="flex-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Salvando..." : operation ? "Atualizar" : "Criar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
