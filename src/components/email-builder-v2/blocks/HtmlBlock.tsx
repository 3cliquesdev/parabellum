import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Code, Eye, Pencil, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { EmailBlock } from "@/types/emailBuilderV2";

interface HtmlBlockProps {
  block: EmailBlock;
  isSelected: boolean;
  onUpdate: (content: { html: string }) => void;
  readOnly?: boolean;
}

export function HtmlBlock({ block, isSelected, onUpdate, readOnly }: HtmlBlockProps) {
  const [mode, setMode] = useState<"preview" | "edit" | "code">("preview");
  const editableRef = useRef<HTMLDivElement>(null);

  // Sync contentEditable with block content when switching to edit mode
  useEffect(() => {
    if (mode === "edit" && editableRef.current) {
      editableRef.current.innerHTML = block.content.html || "";
    }
  }, [mode]);

  const handleEditableBlur = () => {
    if (editableRef.current) {
      onUpdate({ html: editableRef.current.innerHTML });
    }
  };

  const handleEditableInput = () => {
    if (editableRef.current) {
      onUpdate({ html: editableRef.current.innerHTML });
    }
  };

  return (
    <div
      className={cn(
        "relative transition-all",
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
      style={{
        backgroundColor: block.styles.backgroundColor || '#ffffff',
        color: '#1e293b',
        padding: block.styles.padding || "16px",
      }}
    >
      {readOnly ? (
        <div className="text-slate-800" dangerouslySetInnerHTML={{ __html: block.content.html || "" }} />
      ) : (
        <Tabs value={mode} onValueChange={(v) => setMode(v as "preview" | "edit" | "code")}>
          <div className="flex items-center justify-between mb-2">
            <TabsList className="h-8 bg-slate-100">
              <TabsTrigger value="preview" className="text-xs gap-1 text-slate-700 data-[state=active]:bg-white data-[state=active]:text-slate-900">
                <Eye className="h-3 w-3" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="edit" className="text-xs gap-1 text-slate-700 data-[state=active]:bg-white data-[state=active]:text-slate-900">
                <Pencil className="h-3 w-3" />
                Editar
              </TabsTrigger>
              <TabsTrigger value="code" className="text-xs gap-1 text-slate-700 data-[state=active]:bg-white data-[state=active]:text-slate-900">
                <Code className="h-3 w-3" />
                HTML
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="preview" className="mt-0">
            {block.content.html ? (
              <div className="text-slate-800" dangerouslySetInnerHTML={{ __html: block.content.html }} />
            ) : (
              <div className="text-center text-muted-foreground py-4 border border-dashed rounded">
                <Code className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Clique em "Editar" ou "HTML" para adicionar conteúdo</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="edit" className="mt-0">
            <Alert className="mb-3 bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-xs">
                Modo de edição visual. Clique no conteúdo para editar textos, imagens e links diretamente.
              </AlertDescription>
            </Alert>
            <div
              ref={editableRef}
              contentEditable
              suppressContentEditableWarning
              onBlur={handleEditableBlur}
              onInput={handleEditableInput}
              className="min-h-[100px] outline-none focus:ring-2 focus:ring-primary/20 rounded p-2 text-slate-800 [&_a]:text-blue-600 [&_a]:underline [&_img]:max-w-full [&_img]:cursor-pointer"
              style={{ backgroundColor: block.styles.backgroundColor || '#ffffff' }}
              dangerouslySetInnerHTML={{ __html: block.content.html || "<p>Clique aqui para editar...</p>" }}
            />
          </TabsContent>

          <TabsContent value="code" className="mt-0">
            <Textarea
              value={block.content.html || ""}
              onChange={(e) => onUpdate({ html: e.target.value })}
              placeholder="<div>Seu HTML aqui...</div>"
              className="font-mono text-xs min-h-[150px]"
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
