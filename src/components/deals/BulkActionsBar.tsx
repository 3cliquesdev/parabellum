import { Button } from "@/components/ui/button";
import { ArrowRightLeft, X, Users, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BulkActionsBarProps {
  selectedCount: number;
  onMoveClick: () => void;
  onTransferClick: () => void;
  onClearSelection: () => void;
}

export default function BulkActionsBar({
  selectedCount,
  onMoveClick,
  onTransferClick,
  onClearSelection,
}: BulkActionsBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl shadow-lg">
            <span className="text-sm font-medium text-foreground">
              {selectedCount} negócio{selectedCount > 1 ? "s" : ""} selecionado{selectedCount > 1 ? "s" : ""}
            </span>
            
            <div className="h-6 border-l border-border" />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" className="gap-2">
                  Ações
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem onClick={onMoveClick} className="gap-2 cursor-pointer">
                  <ArrowRightLeft className="h-4 w-4" />
                  Mover para Pipeline
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onTransferClick} className="gap-2 cursor-pointer">
                  <Users className="h-4 w-4" />
                  Transferir para Vendedor
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground hover:text-foreground"
              onClick={onClearSelection}
            >
              <X className="h-4 w-4" />
              Limpar
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
