import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, PanelTop, X, Upload, Link, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  const [isUploading, setIsUploading] = useState(false);
  const [tempUrl, setTempUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem (JPG, PNG, GIF, WebP)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `email-templates/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error } = await supabase.storage
        .from('media')
        .upload(fileName, file, {
          cacheControl: '31536000',
          upsert: false,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      onUpdate({ src: publicUrlData.publicUrl });

      toast({
        title: "Upload concluído",
        description: "Imagem adicionada com sucesso!",
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erro no upload",
        description: error.message || "Não foi possível fazer upload da imagem",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUrlSave = () => {
    if (tempUrl) {
      onUpdate({ src: tempUrl });
      setTempUrl("");
    }
  };

  const handleRemoveImage = () => {
    onUpdate({ src: "" });
  };

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
              {/* Image Section */}
              <div className="space-y-2">
                <Label>Imagem do Banner</Label>
                
                {block.content.src ? (
                  <div className="space-y-2">
                    <div className="relative rounded-md overflow-hidden border">
                      <img 
                        src={block.content.src} 
                        alt="Preview" 
                        className="w-full h-20 object-cover"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-1" />
                            Trocar
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleRemoveImage}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <Tabs defaultValue="upload" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="upload" className="gap-1 text-xs">
                        <Upload className="h-3 w-3" />
                        Upload
                      </TabsTrigger>
                      <TabsTrigger value="url" className="gap-1 text-xs">
                        <Link className="h-3 w-3" />
                        URL
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="upload" className="mt-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Escolher Imagem
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center mt-1">
                        JPG, PNG, GIF ou WebP (max 5MB)
                      </p>
                    </TabsContent>
                    
                    <TabsContent value="url" className="mt-2 space-y-2">
                      <Input
                        placeholder="https://..."
                        value={tempUrl}
                        onChange={(e) => setTempUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleUrlSave()}
                        className="text-xs"
                      />
                      <Button 
                        size="sm" 
                        onClick={handleUrlSave} 
                        disabled={!tempUrl} 
                        className="w-full"
                      >
                        Adicionar
                      </Button>
                    </TabsContent>
                  </Tabs>
                )}
              </div>

              {/* HTML Section */}
              <div className="space-y-2">
                <Label>HTML Customizado (opcional)</Label>
                <div className="flex gap-2">
                  <Input
                    value={block.content.html || ""}
                    onChange={(e) => onUpdate({ html: e.target.value })}
                    placeholder="<h1>Título</h1>"
                    className="text-xs truncate"
                  />
                  {block.content.html && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onUpdate({ html: "" })}
                      className="shrink-0 h-9 w-9"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Colors Section */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-xs">Cor de Fundo</Label>
                  <Input
                    type="color"
                    value={block.styles.backgroundColor || "#2563eb"}
                    onChange={(e) => onStyleUpdate({ backgroundColor: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Cor do Texto</Label>
                  <Input
                    type="color"
                    value={block.styles.color || "#ffffff"}
                    onChange={(e) => onStyleUpdate({ color: e.target.value })}
                    className="h-9"
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
