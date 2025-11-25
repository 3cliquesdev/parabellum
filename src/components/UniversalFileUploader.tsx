import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import readXlsxFile from 'read-excel-file';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UniversalFileUploaderProps {
  onDataParsed: (data: any[], headers: string[]) => void;
}

export function UniversalFileUploader({ onDataParsed }: UniversalFileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleFile = useCallback(
    async (selectedFile: File) => {
      const fileType = selectedFile.name.toLowerCase();
      
      try {
        if (fileType.endsWith('.csv')) {
          // Parse CSV
          Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.data.length > 0) {
                const headers = Object.keys(results.data[0] as object);
                onDataParsed(results.data, headers);
                setFile(selectedFile);
              }
            },
            error: (error) => {
              toast({
                title: 'Erro ao ler CSV',
                description: error.message,
                variant: 'destructive',
              });
            },
          });
        } else if (fileType.endsWith('.xlsx') || fileType.endsWith('.xls')) {
          // Parse Excel
          const rows = await readXlsxFile(selectedFile);
          
          if (rows.length > 0) {
            const headers = rows[0].map(h => String(h));
            const data = rows.slice(1).map(row => {
              const obj: Record<string, any> = {};
              headers.forEach((header, index) => {
                obj[header] = row[index];
              });
              return obj;
            });
            
            onDataParsed(data, headers);
            setFile(selectedFile);
          }
        } else {
          toast({
            title: 'Formato não suportado',
            description: 'Apenas arquivos CSV, XLSX e XLS são aceitos.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        toast({
          title: 'Erro ao processar arquivo',
          description: error instanceof Error ? error.message : 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    },
    [onDataParsed, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFile(droppedFile);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFile(selectedFile);
      }
    },
    [handleFile]
  );

  const clearFile = useCallback(() => {
    setFile(null);
    onDataParsed([], []);
  }, [onDataParsed]);

  if (file) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={clearFile}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`border-2 border-dashed rounded-lg transition-colors ${
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50'
      }`}
    >
      <div className="p-12 text-center">
        <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Arraste seu arquivo aqui
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          ou clique para selecionar
        </p>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload">
          <Button variant="outline" asChild>
            <span>Selecionar Arquivo</span>
          </Button>
        </label>
        <p className="text-xs text-muted-foreground mt-4">
          Formatos aceitos: CSV, XLSX, XLS
        </p>
      </div>
    </div>
  );
}
