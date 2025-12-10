import { cn } from "@/lib/utils";
import type { EmailBlock } from "@/types/emailBuilderV2";

interface DividerBlockProps {
  block: EmailBlock;
  isSelected: boolean;
  readOnly?: boolean;
}

export function DividerBlock({ block, isSelected }: DividerBlockProps) {
  return (
    <div
      className={cn(
        "py-4 transition-all",
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
      style={{
        padding: block.styles.padding || "16px 0",
      }}
    >
      <hr
        style={{
          borderColor: block.styles.color || "hsl(var(--border))",
          borderWidth: "1px",
          borderStyle: "solid",
        }}
      />
    </div>
  );
}
