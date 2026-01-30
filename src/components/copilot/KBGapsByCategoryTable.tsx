import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BookOpen, AlertTriangle } from "lucide-react";
import type { KBGapByCategory } from "@/hooks/useCopilotHealthScore";

interface KBGapsByCategoryTableProps {
  data: KBGapByCategory[] | undefined;
  isLoading?: boolean;
}

export function KBGapsByCategoryTable({ data, isLoading }: KBGapsByCategoryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          KB Gaps por Categoria
        </CardTitle>
        <CardDescription>
          Categorias com mais lacunas de conhecimento identificadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !data?.length ? (
          <div className="py-8 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-1">Nenhum KB Gap encontrado</h3>
            <p className="text-sm text-muted-foreground">
              A base de conhecimento está bem coberta! 🎉
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-center">Gaps</TableHead>
                <TableHead className="text-center">Total Conversas</TableHead>
                <TableHead className="text-center">Taxa de Gap</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((category) => (
                <TableRow key={category.category}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {category.gap_rate >= 30 && (
                        <AlertTriangle className="h-4 w-4 text-chart-4" />
                      )}
                      {category.category}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-chart-4 font-medium">
                      {category.gap_count}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{category.total_conversations}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Progress
                        value={category.gap_rate}
                        className="w-16 h-2"
                      />
                      <span className="text-sm text-muted-foreground w-12">
                        {category.gap_rate}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
