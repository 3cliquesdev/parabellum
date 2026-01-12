import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles } from "lucide-react";

interface VersionUpdateModalProps {
  isOpen: boolean;
  onUpdate: () => void;
}

export function VersionUpdateModal({ isOpen, onUpdate }: VersionUpdateModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton
      >
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">
            Nova Versão Disponível!
          </DialogTitle>
          <DialogDescription className="text-base">
            Uma atualização importante está disponível com melhorias e correções.
            Por favor, atualize agora para continuar usando o sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-6">
          <Button onClick={onUpdate} size="lg" className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar Agora
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            O app será recarregado automaticamente
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
