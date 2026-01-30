import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BroadcastAIQueueDialog } from "./BroadcastAIQueueDialog";
import { Radio } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

interface BroadcastAIQueueButtonProps {
  queueCount: number;
  filter: string;
}

const ALLOWED_ROLES = ["admin", "manager", "general_manager"];

export function BroadcastAIQueueButton({ queueCount, filter }: BroadcastAIQueueButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { role } = useUserRole();

  // Só mostrar o botão se:
  // 1. Filtro é ai_queue
  // 2. Há conversas na fila
  // 3. Usuário tem permissão
  const canBroadcast = 
    filter === "ai_queue" && 
    queueCount > 0 && 
    role && 
    ALLOWED_ROLES.includes(role);

  if (!canBroadcast) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
        className="gap-2 text-xs"
      >
        <Radio className="h-3.5 w-3.5" />
        Broadcast ({queueCount})
      </Button>

      <BroadcastAIQueueDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        queueCount={queueCount}
      />
    </>
  );
}
