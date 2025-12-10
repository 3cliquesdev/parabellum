import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import type { EmailBlock } from "@/types/emailBuilderV2";

interface SpacerBlockProps {
  block: EmailBlock;
  isSelected: boolean;
  onUpdate: (content: { height: number }) => void;
  readOnly?: boolean;
}

export function SpacerBlock({ block, isSelected, onUpdate, readOnly }: SpacerBlockProps) {
  const height = block.content.height || 40;

  return (
    <div
      className={cn(
        "relative group transition-all",
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
      style={{
        height: `${height}px`,
        backgroundColor: block.styles.backgroundColor,
      }}
    >
      {!readOnly && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-card border rounded-lg p-3 shadow-lg flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-8">{height}px</span>
            <Slider
              value={[height]}
              onValueChange={([value]) => onUpdate({ height: value })}
              min={10}
              max={200}
              step={5}
              className="w-32"
            />
          </div>
        </div>
      )}

      {/* Visual indicator */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-muted-foreground/30" />
    </div>
  );
}
