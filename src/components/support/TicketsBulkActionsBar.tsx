import { Button } from "@/components/ui/button";
import { FolderInput, Archive, ArrowRightLeft, X, Loader2 } from "lucide-react";

interface TicketsBulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onMoveToProject: () => void;
  onArchive: () => void;
  onTransfer: () => void;
  isArchiving?: boolean;
}

export function TicketsBulkActionsBar({
  selectedCount,
  onClear,
  onMoveToProject,
  onArchive,
  onTransfer,
  isArchiving,
}: TicketsBulkActionsBarProps) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-lg shadow-lg">
        <span className="text-sm font-medium text-foreground">
          {selectedCount} ticket{selectedCount > 1 ? "s" : ""} selecionado{selectedCount > 1 ? "s" : ""}
        </span>

        <div className="h-4 w-px bg-border" />

        <Button
          variant="outline"
          size="sm"
          onClick={onMoveToProject}
          className="gap-2"
        >
          <FolderInput className="h-4 w-4" />
          Mover para Projeto
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onArchive}
          disabled={isArchiving}
          className="gap-2"
        >
          {isArchiving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
          Arquivar
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onTransfer}
          className="gap-2"
        >
          <ArrowRightLeft className="h-4 w-4" />
          Transferir
        </Button>

        <div className="h-4 w-px bg-border" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="gap-2 text-muted-foreground"
        >
          <X className="h-4 w-4" />
          Limpar
        </Button>
      </div>
    </div>
  );
}
