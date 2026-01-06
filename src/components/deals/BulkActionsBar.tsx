import { Button } from "@/components/ui/button";
import { ArrowRightLeft, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BulkActionsBarProps {
  selectedCount: number;
  onMoveClick: () => void;
  onClearSelection: () => void;
}

export default function BulkActionsBar({
  selectedCount,
  onMoveClick,
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
            
            <Button
              variant="default"
              size="sm"
              className="gap-2"
              onClick={onMoveClick}
            >
              <ArrowRightLeft className="h-4 w-4" />
              Mover para Pipeline
            </Button>
            
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
