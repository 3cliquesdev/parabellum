import { cn } from "@/lib/utils";
import type { EmailBlock } from "@/types/emailBuilderV2";

interface ColumnsBlockProps {
  block: EmailBlock;
  isSelected: boolean;
  onUpdate: (content: Partial<EmailBlock['content']>) => void;
  readOnly?: boolean;
}

export function ColumnsBlock({ block, isSelected, onUpdate, readOnly }: ColumnsBlockProps) {
  const columns = block.content.columns || 2;

  return (
    <div
      className={cn(
        "grid gap-4 transition-all",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
        columns === 4 && "grid-cols-4",
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
      style={{
        backgroundColor: block.styles.backgroundColor || '#ffffff',
        padding: block.styles.padding || "16px",
      }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <div 
          key={i} 
          className="min-h-[60px] border-2 border-dashed border-slate-300 rounded p-4 bg-slate-50"
        >
          <span className="text-slate-500 text-sm">Coluna {i + 1}</span>
        </div>
      ))}
    </div>
  );
}
