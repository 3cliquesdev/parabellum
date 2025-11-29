import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Upload, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface DocumentUploaderProps {
  onTextExtracted: (text: string, fileName: string, pageCount?: number) => void;
}

export function DocumentUploader({ onTextExtracted }: DocumentUploaderProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string>("");

  const parseDocx = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const parsePdf = async (file: File): Promise<{ text: string; pages: number }> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      setProgress((i / pdf.numPages) * 100);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n\n';
    }
    
    return { text: fullText, pages: pdf.numPages };
  };

  const parseTxt = async (file: File): Promise<string> => {
    return await file.text();
  };

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    setCurrentFile(file.name);

    try {
      let extractedText = '';
      let pageCount: number | undefined;

      if (file.name.endsWith('.pdf')) {
        const result = await parsePdf(file);
        extractedText = result.text;
        pageCount = result.pages;
      } else if (file.name.endsWith('.docx')) {
        extractedText = await parseDocx(file);
        setProgress(100);
      } else if (file.name.endsWith('.txt')) {
        extractedText = await parseTxt(file);
        setProgress(100);
      } else {
        throw new Error('Formato de arquivo não suportado');
      }

      if (!extractedText.trim()) {
        throw new Error('Nenhum texto foi extraído do documento');
      }

      // Preview first 500 characters
      setPreviewText(extractedText.substring(0, 500));
      
      onTextExtracted(extractedText, file.name, pageCount);

      toast({
        title: "Documento processado",
        description: `${extractedText.length.toLocaleString()} caracteres extraídos${pageCount ? ` de ${pageCount} páginas` : ''}`,
      });
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Erro ao processar documento",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
      handleClear();
    } finally {
      setIsProcessing(false);
    }
  }, [onTextExtracted, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        processFile(acceptedFiles[0]);
      }
    },
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  const handleClear = () => {
    setCurrentFile(null);
    setPreviewText("");
    setProgress(0);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {!currentFile ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-accent/50'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground mb-2">
              {isDragActive ? 'Solte o documento aqui' : 'Arraste seu documento aqui'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              ou clique para selecionar
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>📄 PDF</span>
              <span>•</span>
              <span>📝 DOCX</span>
              <span>•</span>
              <span>📄 DOC</span>
              <span>•</span>
              <span>📃 TXT</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm text-foreground">{currentFile}</p>
                  {isProcessing && (
                    <p className="text-xs text-muted-foreground">
                      Processando... {Math.round(progress)}%
                    </p>
                  )}
                </div>
              </div>
              {!isProcessing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {isProcessing && (
              <Progress value={progress} className="h-2" />
            )}

            {previewText && !isProcessing && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Preview do Texto Extraído:</p>
                <ScrollArea className="h-32 rounded-md border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {previewText}
                    {previewText.length >= 500 && ' [...]'}
                  </p>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
