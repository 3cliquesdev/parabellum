import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DataPreviewTableProps {
  data: any[];
  headers: string[];
  highlightedColumns?: string[];
}

export function DataPreviewTable({ data, headers, highlightedColumns = [] }: DataPreviewTableProps) {
  const previewData = data.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>📋 Preview dos Dados</CardTitle>
        <CardDescription>
          Primeiras 5 linhas do arquivo ({data.length} linhas no total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header) => (
                    <TableHead 
                      key={header}
                      className={
                        highlightedColumns.includes(header)
                          ? 'bg-primary/10 font-bold'
                          : ''
                      }
                    >
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, idx) => (
                  <TableRow key={idx}>
                    {headers.map((header) => (
                      <TableCell 
                        key={header}
                        className={
                          highlightedColumns.includes(header)
                            ? 'bg-primary/5'
                            : ''
                        }
                      >
                        {String(row[header] || '')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
