import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggableBlockProps {
  type: string;
  icon: LucideIcon;
  label: string;
  color?: string;
}

export function DraggableBlock({ type, icon: Icon, label, color }: DraggableBlockProps) {
  const onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('application/reactflow', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl",
        "border bg-card hover:shadow-lg",
        "cursor-grab active:cursor-grabbing transition-all duration-200",
        "hover:scale-105 hover:border-primary group"
      )}
    >
      <div className={cn(
        "p-2.5 rounded-lg transition-colors",
        color || "bg-muted"
      )}>
        <Icon className={cn(
          "h-5 w-5 transition-colors",
          color ? "text-white" : "text-muted-foreground group-hover:text-primary"
        )} />
      </div>
      <span className="text-xs font-medium text-center leading-tight">{label}</span>
    </div>
  );
}
