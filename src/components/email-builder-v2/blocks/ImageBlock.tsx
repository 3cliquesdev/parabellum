import { useState } from "react";
import { cn } from "@/lib/utils";
import { Image as ImageIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EmailBlock } from "@/types/emailBuilderV2";

interface ImageBlockProps {
  block: EmailBlock;
  isSelected: boolean;
  onUpdate: (content: { src?: string; alt?: string; url?: string }) => void;
  readOnly?: boolean;
}

export function ImageBlock({ block, isSelected, onUpdate, readOnly }: ImageBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempUrl, setTempUrl] = useState(block.content.src || "");

  const handleSave = () => {
    onUpdate({ src: tempUrl });
    setIsEditing(false);
  };

  if (!block.content.src && !readOnly) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-lg transition-all",
          "bg-muted/50 hover:bg-muted",
          isSelected && "ring-2 ring-primary ring-offset-2"
        )}
        style={{
          padding: block.styles.padding || "32px",
        }}
      >
        <ImageIcon className="h-10 w-10 text-muted-foreground" />
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Input
            placeholder="Cole a URL da imagem..."
            value={tempUrl}
            onChange={(e) => setTempUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <Button size="sm" onClick={handleSave} disabled={!tempUrl}>
            <Upload className="h-4 w-4 mr-2" />
            Adicionar Imagem
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative group transition-all",
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
      style={{
        backgroundColor: block.styles.backgroundColor,
        padding: block.styles.padding,
        textAlign: block.styles.textAlign,
      }}
    >
      {block.content.url ? (
        <a href={block.content.url} target="_blank" rel="noopener noreferrer">
          <img
            src={block.content.src}
            alt={block.content.alt || "Email image"}
            className="max-w-full h-auto mx-auto"
            style={{
              borderRadius: block.styles.borderRadius,
            }}
          />
        </a>
      ) : (
        <img
          src={block.content.src}
          alt={block.content.alt || "Email image"}
          className="max-w-full h-auto mx-auto"
          style={{
            borderRadius: block.styles.borderRadius,
          }}
        />
      )}

      {!readOnly && (
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsEditing(true)}
          >
            Alterar Imagem
          </Button>
        </div>
      )}

      {isEditing && (
        <div className="absolute inset-0 bg-background/95 flex items-center justify-center p-4">
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Input
              placeholder="URL da imagem..."
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} className="flex-1">
                Salvar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
