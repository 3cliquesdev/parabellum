import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings, PanelTop } from "lucide-react";
import type { EmailBlock } from "@/types/emailBuilderV2";

interface BannerBlockProps {
  block: EmailBlock;
  isSelected: boolean;
  onUpdate: (content: { src?: string; alt?: string; html?: string }) => void;
  onStyleUpdate: (styles: Partial<EmailBlock['styles']>) => void;
  readOnly?: boolean;
}

export function BannerBlock({ block, isSelected, onUpdate, onStyleUpdate, readOnly }: BannerBlockProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={cn(
        "relative group min-h-[100px] flex items-center justify-center transition-all",
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
      style={{
        backgroundColor: block.styles.backgroundColor || "hsl(var(--primary))",
        color: block.styles.color || "hsl(var(--primary-foreground))",
        padding: block.styles.padding || "40px 20px",
        textAlign: block.styles.textAlign || "center",
      }}
    >
      {block.content.src ? (
        <img
          src={block.content.src}
          alt={block.content.alt || "Banner"}
          className="max-w-full h-auto"
        />
      ) : block.content.html ? (
        <div dangerouslySetInnerHTML={{ __html: block.content.html }} />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <PanelTop className="h-8 w-8 opacity-50" />
          <span className="text-sm opacity-70">Banner</span>
        </div>
      )}

      {!readOnly && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>URL da Imagem (opcional)</Label>
                <Input
                  value={block.content.src || ""}
                  onChange={(e) => onUpdate({ src: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>HTML (opcional)</Label>
                <Input
                  value={block.content.html || ""}
                  onChange={(e) => onUpdate({ html: e.target.value })}
                  placeholder="<h1>Título</h1>"
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
  );
}
