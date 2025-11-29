import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface BlockUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  onConfirm: (reason: string) => void;
}

export function BlockUserDialog({ open, onOpenChange, userName, onConfirm }: BlockUserDialogProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason);
      setReason("");
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bloquear Usuário</AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a bloquear <strong>{userName}</strong>.
            O usuário não conseguirá fazer login no sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-2">
          <Label htmlFor="block-reason">Motivo do Bloqueio *</Label>
          <Textarea
            id="block-reason"
            placeholder="Ex: Violação de política de uso, término de contrato, etc."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!reason.trim()}
            className="bg-destructive hover:bg-destructive/90"
          >
            Bloquear
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
