import { useCallback, useState } from "react";
import { Upload, FileText, X, Layers } from "lucide-react";
import Papa from "papaparse";
import readXlsxFile, { readSheetNames } from "read-excel-file";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CSVUploaderProps {
  onDataParsed: (data: any[], headers: string[], headerRowIndex?: number, sheetName?: string) => void;
}

/**
 * Sanitiza um header: trim, remove caracteres invisíveis (BOM, ZWNBSP, etc.)
 */
function sanitizeHeader(raw: string): string {
  return raw
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function ensureUniqueHeaders(headers: string[]): string[] {
  const seen: Record<string, number> = {};
  return headers.map((h) => {
    if (!h) return h;
    const lower = h.toLowerCase();
    if (seen[lower] !== undefined) {
      seen[lower]++;
      return `${h}_${seen[lower]}`;
    }
    seen[lower] = 1;
    return h;
  });
}

const KNOWN_HEADER_ALIASES = new Set([
  'id', 'nome', 'name', 'first_name', 'last_name', 'sobrenome',
  'email', 'e-mail', 'mail',
  'telefone', 'phone', 'tel', 'celular', 'fone',
  'empresa', 'company', 'companhia',
  'cpf', 'cnpj', 'documento', 'document', 'cpf/cnpj', 'cnpj ou cpf',
  'ie', 'inscricao estadual', 'state_registration',
  'endereco', 'address', 'rua', 'logradouro', 'endereço',
  'numero', 'number', 'num', 'número',
  'complemento', 'complement',
  'bairro', 'neighborhood', 'district',
  'cidade', 'city', 'municipio', 'município',
  'estado', 'state', 'uf',
  'cep', 'zip', 'zipcode', 'zip_code',
  'nascimento', 'birth_date', 'data de nascimento', 'data_nascimento',
  'tipo', 'customer_type', 'tipo de cliente', 'tipo_cliente',
  'bloqueado', 'blocked', 'ativo', 'status',
  'plano', 'subscription_plan', 'assinatura', 'plano de assinatura',
  'cadastro', 'registration_date', 'data_cadastro', 'data de cadastro', 'data cadastro', 'data de registro', 'data registro',
  'ultimo pagamento', 'last_payment_date', 'último pagamento',
  'proximo pagamento', 'next_payment_date', 'próximo pagamento',
  'pedidos', 'orders', 'pedidos recentes',
  'saldo', 'balance', 'account_balance', 'saldo da conta',
  'consultor', 'consultant', 'responsavel', 'responsável', 'assigned_to',
  'id_consultor', 'consultant_id', 'id consultor', 'uuid_consultor',
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function scoreHeaderRow(row: any[]): number {
  if (!row || row.length === 0) return -1;
  let score = 0;
  let filledCount = 0;
  for (const cell of row) {
    const val = String(cell ?? '').trim();
    if (!val) continue;
    filledCount++;
    if (val.length <= 40) score += 1;
    if (val.length <= 20) score += 1;
    const normalized = val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (KNOWN_HEADER_ALIASES.has(normalized)) score += 5;
    if (/^\d+([.,]\d+)?$/.test(val)) score -= 2;
    if (UUID_RE.test(val)) score -= 3;
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(val) || /^\d{4}-\d{2}-\d{2}/.test(val)) score -= 2;
    if (/^\(\d{2}\)\s?\d{4,5}-\d{4}$/.test(val)) score -= 2;
    if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(val) || /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(val)) score -= 2;
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val)) score -= 2;
    if (val.length > 50) score -= 2;
  }
  if (filledCount < 3) score -= 5;
  return score;
}

function findBestHeaderRow(rows: any[][], maxScan = 100): number {
  let bestIdx = 0;
  let bestScore = -Infinity;
  const candidates: { idx: number; score: number; preview: string }[] = [];
  const limit = Math.min(rows.length, maxScan);
  for (let i = 0; i < limit; i++) {
    const row = rows[i];
    if (!row) continue;
    const score = scoreHeaderRow(row);
    candidates.push({
      idx: i,
      score,
      preview: row.slice(0, 5).map(c => String(c ?? '').substring(0, 20)).join(' | '),
    });
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  console.log('[CSVUploader] Header detection — top 3 candidates:',
    candidates.slice(0, 3).map(c => `row ${c.idx} (score ${c.score}): \"${c.preview}\"`)
  );
  console.log('[CSVUploader] Header row chosen: index', bestIdx, '| score:', bestScore);
  return bestIdx;
}

function processHeaders(rawHeaders: string[], dataRows?: Record<string, string>[]): string[] {
  let headers = rawHeaders.map((h, i) => {
    const clean = sanitizeHeader(String(h ?? ''));
    return clean || `coluna_${i + 1}`;
  });
  if (dataRows && dataRows.length > 0) {
    headers = headers.filter(h => {
      return dataRows.some(row => {
        const val = row[h];
        return val != null && String(val).trim() !== '';
      });
    });
  }
  return ensureUniqueHeaders(headers);
}

/**
 * Parse a single sheet's rows into headers + data
 */
function parseSheetRows(rows: any[][]): { headers: string[]; data: Record<string, string>[]; headerIdx: number } | null {
  if (rows.length < 2) return null;
  const headerIdx = findBestHeaderRow(rows);
  const rawHeaders = rows[headerIdx].map(cell => String(cell ?? ''));
  const sanitizedHeaders = rawHeaders.map(h => sanitizeHeader(h));
  const headerKeys = sanitizedHeaders.map((h, i) => h || `coluna_${i + 1}`);
  const dataRows = rows.slice(headerIdx + 1);
  const data = dataRows.map(row => {
    const obj: Record<string, string> = {};
    headerKeys.forEach((key, index) => {
      obj[key] = row[index] != null ? String(row[index]) : '';
    });
    return obj;
  });
  const finalHeaders = processHeaders(headerKeys, data);
  if (finalHeaders.length === 0) return null;
  return { headers: finalHeaders, data, headerIdx };
}

export function CSVUploader({ onDataParsed }: CSVUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Multi-sheet state
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<number>(1); // 1-indexed
  const [isParsingSheet, setIsParsingSheet] = useState(false);

  const parseCSV = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      let content = e.target?.result as string;
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      Papa.parse(content, {
        header: false,
        skipEmptyLines: true,
        delimiter: '',
        complete: (rawResults) => {
          const allRows = rawResults.data as string[][];
          if (allRows.length < 2) {
            alert('Arquivo vazio ou formato inválido.');
            setFile(null);
            return;
          }
          const result = parseSheetRows(allRows);
          if (!result) {
            alert('Não encontramos cabeçalhos válidos no CSV.');
            setFile(null);
            return;
          }
          console.log('[CSVUploader] CSV parsed headers:', result.headers, '| header row:', result.headerIdx, '| total linhas:', result.data.length);
          onDataParsed(result.data, result.headers, result.headerIdx);
        },
        error: (error) => {
          console.error('Erro ao processar CSV:', error);
          alert('Erro ao processar arquivo CSV');
          setFile(null);
        },
      });
    };
    reader.onerror = () => {
      alert('Erro ao ler arquivo');
      setFile(null);
    };
    reader.readAsText(file, 'UTF-8');
  }, [onDataParsed]);

  const parseExcelSheet = useCallback(async (file: File, sheetNumber: number, sheetName?: string) => {
    try {
      setIsParsingSheet(true);
      console.log(`[CSVUploader] Parsing sheet #${sheetNumber} (${sheetName || 'unknown'})`);
      const rows = await readXlsxFile(file, { sheet: sheetNumber });
      const result = parseSheetRows(rows);
      if (!result) {
        alert(`Aba "${sheetName || sheetNumber}" não possui cabeçalhos válidos.`);
        setIsParsingSheet(false);
        return;
      }
      console.log('[CSVUploader] Excel parsed headers:', result.headers, '| sheet:', sheetName, '| header row:', result.headerIdx, '| total linhas:', result.data.length);
      onDataParsed(result.data, result.headers, result.headerIdx, sheetName);
      setIsParsingSheet(false);
    } catch (error: any) {
      console.error('Erro ao processar Excel:', error);
      if (error?.message?.includes('invalid zip') || error?.code === 13) {
        alert('Formato .xls (Excel 97-2003) não suportado.\n\nPor favor, abra o arquivo no Excel e salve como:\n• .xlsx (Excel moderno)\n• .csv (separado por ponto-e-vírgula)');
      } else {
        alert('Erro ao processar planilha Excel. Verifique se o arquivo não está corrompido.');
      }
      setFile(null);
      setIsParsingSheet(false);
    }
  }, [onDataParsed]);

  const parseExcel = useCallback(async (file: File) => {
    try {
      // 1. Get all sheet names
      const names = await readSheetNames(file);
      console.log('[CSVUploader] Sheet names found:', names);
      setSheetNames(names);

      if (names.length <= 1) {
        // Single sheet — parse directly (sheet 1)
        setSelectedSheet(1);
        await parseExcelSheet(file, 1, names[0]);
        return;
      }

      // 2. Multi-sheet: score each sheet to find best one
      let bestSheetIdx = 0; // 0-based index into names array
      let bestScore = -Infinity;

      for (let i = 0; i < names.length; i++) {
        try {
          const rows = await readXlsxFile(file, { sheet: i + 1 });
          if (rows.length < 2) continue;
          const headerIdx = findBestHeaderRow(rows);
          const score = scoreHeaderRow(rows[headerIdx]);
          console.log(`[CSVUploader] Sheet "${names[i]}" (${i + 1}): best header score = ${score}`);
          if (score > bestScore) {
            bestScore = score;
            bestSheetIdx = i;
          }
        } catch (e) {
          console.warn(`[CSVUploader] Could not read sheet "${names[i]}":`, e);
        }
      }

      const bestSheetNumber = bestSheetIdx + 1;
      console.log(`[CSVUploader] Auto-selected sheet: "${names[bestSheetIdx]}" (#${bestSheetNumber}) with score ${bestScore}`);
      setSelectedSheet(bestSheetNumber);
      await parseExcelSheet(file, bestSheetNumber, names[bestSheetIdx]);
    } catch (error: any) {
      console.error('Erro ao processar Excel:', error);
      if (error?.message?.includes('invalid zip') || error?.code === 13) {
        alert('Formato .xls (Excel 97-2003) não suportado.\n\nPor favor, abra o arquivo no Excel e salve como:\n• .xlsx (Excel moderno)\n• .csv (separado por ponto-e-vírgula)');
      } else {
        alert('Erro ao processar planilha Excel.');
      }
      setFile(null);
    }
  }, [parseExcelSheet]);

  const handleSheetChange = useCallback((value: string) => {
    const sheetNum = parseInt(value, 10);
    if (!file || isNaN(sheetNum)) return;
    setSelectedSheet(sheetNum);
    parseExcelSheet(file, sheetNum, sheetNames[sheetNum - 1]);
  }, [file, sheetNames, parseExcelSheet]);

  const handleFile = useCallback((selectedFile: File) => {
    const fileName = selectedFile.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv') || fileName.endsWith('.txt');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isCSV && !isExcel) {
      alert('Por favor, selecione um arquivo CSV ou Excel (.xlsx)');
      return;
    }
    if (fileName.endsWith('.xls') && !fileName.endsWith('.xlsx')) {
      alert('Formato .xls (Excel 97-2003) não suportado.\n\nPor favor, abra o arquivo no Excel e salve como:\n• .xlsx (Excel moderno)\n• .csv (separado por ponto-e-vírgula)');
      return;
    }

    setFile(selectedFile);
    setSheetNames([]);
    setSelectedSheet(1);

    if (isExcel) {
      parseExcel(selectedFile);
    } else {
      parseCSV(selectedFile);
    }
  }, [parseCSV, parseExcel]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFile(selectedFile);
  }, [handleFile]);

  const clearFile = useCallback(() => {
    setFile(null);
    setSheetNames([]);
    setSelectedSheet(1);
    onDataParsed([], []);
  }, [onDataParsed]);

  return (
    <Card className="p-6">
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Arraste sua planilha aqui</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Aceita arquivos Excel (.xlsx) ou CSV
          </p>
          <label htmlFor="file-upload">
            <Button variant="outline" className="cursor-pointer" asChild>
              <span>Selecionar Arquivo</span>
            </Button>
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".csv,.xlsx,.txt"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearFile}
              className="text-destructive hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Sheet selector for multi-sheet XLSX */}
          {sheetNames.length > 1 && (
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
              <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-muted-foreground shrink-0">Aba:</span>
              <Select
                value={String(selectedSheet)}
                onValueChange={handleSheetChange}
                disabled={isParsingSheet}
              >
                <SelectTrigger className="h-8 text-sm max-w-[280px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sheetNames.map((name, i) => (
                    <SelectItem key={i} value={String(i + 1)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                {sheetNames.length} abas encontradas
              </span>
            </div>
          )}

          {isParsingSheet && (
            <p className="text-sm text-muted-foreground animate-pulse text-center">
              Analisando aba...
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
