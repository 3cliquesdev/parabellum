import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Shield, Trash2, Edit, Download } from "lucide-react";

export default function AuditLogs() {
  const [tableFilter, setTableFilter] = useState<string | undefined>();
  const [actionFilter, setActionFilter] = useState<string | undefined>();
  
  const { data: logs = [], isLoading } = useAuditLogs({
    table_name: tableFilter,
    action: actionFilter,
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'DELETE': return <Trash2 className="w-4 h-4" />;
      case 'UPDATE': return <Edit className="w-4 h-4" />;
      case 'EXPORT': return <Download className="w-4 h-4" />;
      default: return null;
    }
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, "destructive" | "default" | "secondary"> = {
      'DELETE': 'destructive',
      'UPDATE': 'default',
      'EXPORT': 'secondary',
    };
    return variants[action] || 'default';
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Logs de Auditoria</h1>
          <p className="text-muted-foreground">
            Registro imutável de todas as operações críticas do sistema
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Filtre os logs por tabela ou tipo de ação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todas as Tabelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Tabelas</SelectItem>
                <SelectItem value="contacts">Contatos</SelectItem>
                <SelectItem value="deals">Negócios</SelectItem>
                <SelectItem value="tickets">Tickets</SelectItem>
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todas as Ações" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Ações</SelectItem>
                <SelectItem value="DELETE">Exclusões</SelectItem>
                <SelectItem value="UPDATE">Atualizações</SelectItem>
                <SelectItem value="EXPORT">Exportações</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Auditoria</CardTitle>
          <CardDescription>
            {logs.length} registros encontrados (últimos 100)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Tabela</TableHead>
                  <TableHead>Registro ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Carregando logs...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum log de auditoria encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {log.user?.full_name || 'Sistema'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadge(log.action)} className="gap-1">
                          {getActionIcon(log.action)}
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{log.table_name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {log.record_id?.slice(0, 8)}...
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
