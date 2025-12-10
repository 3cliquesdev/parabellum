import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings } from "lucide-react";
import type { EmailBlock } from "@/types/emailBuilderV2";

interface ButtonBlockProps {
  block: EmailBlock;
  isSelected: boolean;
  onUpdate: (content: { buttonText?: string; url?: string }) => void;
  onStyleUpdate: (styles: Partial<EmailBlock['styles']>) => void;
  readOnly?: boolean;
}

export function ButtonBlock({ block, isSelected, onUpdate, onStyleUpdate, readOnly }: ButtonBlockProps) {
  const [isEditing, setIsEditing] = useState(false);

  const buttonStyle: React.CSSProperties = {
    backgroundColor: block.styles.backgroundColor || "hsl(var(--primary))",
    color: block.styles.color || "hsl(var(--primary-foreground))",
    padding: block.styles.padding || "12px 24px",
    borderRadius: block.styles.borderRadius || "6px",
    fontSize: block.styles.fontSize || "14px",
    fontWeight: block.styles.fontWeight || "500",
    border: block.styles.border || "none",
    cursor: "pointer",
    display: "inline-block",
    textDecoration: "none",
  };

  return (
    <div
      className={cn(
        "py-4 transition-all",
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
      style={{
        textAlign: block.styles.textAlign || "center",
      }}
    >
      <div className="relative inline-block group">
        {block.content.url && !readOnly ? (
          <a
            href={block.content.url}
            style={buttonStyle}
            onClick={(e) => {
              e.preventDefault();
              setIsEditing(true);
            }}
          >
            {block.content.buttonText || "Clique aqui"}
          </a>
        ) : (
          <button
            style={buttonStyle}
            onClick={() => !readOnly && setIsEditing(true)}
          >
            {block.content.buttonText || "Clique aqui"}
          </button>
        )}

        {!readOnly && (
          <Popover open={isEditing} onOpenChange={setIsEditing}>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="secondary"
                className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Settings className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="center">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Texto do Botão</Label>
                  <Input
                    value={block.content.buttonText || ""}
                    onChange={(e) => onUpdate({ buttonText: e.target.value })}
                    placeholder="Clique aqui"
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL do Link</Label>
                  <Input
                    value={block.content.url || ""}
                    onChange={(e) => onUpdate({ url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Cor de Fundo</Label>
                    <Input
                      type="color"
                      value={block.styles.backgroundColor || "#2563eb"}
                      onChange={(e) => onStyleUpdate({ backgroundColor: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cor do Texto</Label>
                    <Input
                      type="color"
                      value={block.styles.color || "#ffffff"}
                      onChange={(e) => onStyleUpdate({ color: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
