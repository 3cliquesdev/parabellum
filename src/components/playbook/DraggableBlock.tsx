import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggableBlockProps {
  type: string;
  icon: LucideIcon;
  label: string;
}

export function DraggableBlock({ type, icon: Icon, label }: DraggableBlockProps) {
  const onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('application/reactflow', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-3 rounded-lg",
        "border-2 border-border bg-card hover:bg-accent",
        "cursor-grab active:cursor-grabbing transition-all duration-200",
        "hover:border-primary hover:shadow-md"
      )}
    >
      <Icon className="h-5 w-5 text-muted-foreground" />
      <span className="text-xs font-medium text-center">{label}</span>
    </div>
  );
}
