import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubscriptionData, ProductCategory } from "@/hooks/useKiwifySubscriptions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";

interface SubscriptionTableProps {
  subscriptions: SubscriptionData[];
}

type SortField = 'startDate' | 'productName' | 'customerName' | 'status' | 'netValue';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 25;

const categoryColors: Record<ProductCategory, string> = {
  'Associado Premium': 'bg-purple-100 text-purple-700 border-purple-200',
  'Shopee Creation': 'bg-orange-100 text-orange-700 border-orange-200',
  'Híbrido': 'bg-blue-100 text-blue-700 border-blue-200',
  'Uni 3 Cliques': 'bg-green-100 text-green-700 border-green-200',
  'Outros': 'bg-gray-100 text-gray-700 border-gray-200',
};

const statusStyles = {
  active: 'bg-green-100 text-green-700',
  canceled: 'bg-red-100 text-red-700',
  ended: 'bg-gray-100 text-gray-700',
};

const statusLabels = {
  active: 'Ativa',
  canceled: 'Cancelada',
  ended: 'Encerrada',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function SubscriptionTable({ subscriptions }: SubscriptionTableProps) {
  const [sortField, setSortField] = useState<SortField>('startDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Sort subscriptions
  const sortedSubscriptions = useMemo(() => {
    return [...subscriptions].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'startDate':
          comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
          break;
        case 'productName':
          comparison = a.productName.localeCompare(b.productName);
          break;
        case 'customerName':
          comparison = a.customerName.localeCompare(b.customerName);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'netValue':
          comparison = a.netValue - b.netValue;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [subscriptions, sortField, sortDirection]);

  // Paginate
  const totalPages = Math.ceil(sortedSubscriptions.length / ITEMS_PER_PAGE);
  const paginatedSubscriptions = sortedSubscriptions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma assinatura encontrada com os filtros selecionados.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[120px]">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 p-0 font-medium"
                  onClick={() => handleSort('startDate')}
                >
                  Data de Início
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 p-0 font-medium"
                  onClick={() => handleSort('productName')}
                >
                  Produto
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 p-0 font-medium"
                  onClick={() => handleSort('customerName')}
                >
                  Cliente
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 p-0 font-medium"
                  onClick={() => handleSort('status')}
                >
                  Status
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 p-0 font-medium"
                  onClick={() => handleSort('netValue')}
                >
                  Valor Líquido
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSubscriptions.map((sub) => (
              <TableRow key={sub.id} className="hover:bg-muted/50">
                <TableCell className="text-sm">
                  {format(new Date(sub.startDate), 'dd/MM/yyyy', { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <div className="max-w-[200px]">
                    <p className="font-medium truncate" title={sub.productName}>
                      {sub.productName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate" title={sub.offerName}>
                      {sub.offerName}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={categoryColors[sub.productCategory]}>
                    {sub.productCategory}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="max-w-[180px]">
                    <p className="font-medium truncate" title={sub.customerName}>
                      {sub.customerName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate" title={sub.customerEmail}>
                      {sub.customerEmail}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={statusStyles[sub.status]}>
                    {statusLabels[sub.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(sub.netValue)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, subscriptions.length)} de{' '}
            {subscriptions.length} assinaturas
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
