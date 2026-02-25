import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Users, TrendingUp, DollarSign, Target } from "lucide-react";
import { subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormLeadsConversionReport } from "@/hooks/useFormLeadsConversionReport";
import { useExportFormLeadsExcel } from "@/hooks/useExportFormLeadsExcel";

const ITEMS_PER_PAGE = 20;

export default function FormLeadsConversionReport() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [formId, setFormId] = useState<string>("");
  const [page, setPage] = useState(0);

  const { data: forms } = useQuery({
    queryKey: ["forms-list"],
    queryFn: async () => {
      const { data } = await supabase.from("forms").select("id, name").order("name");
      return data ?? [];
    },
  });

  const { dailyData, kpis, isLoading } = useFormLeadsConversionReport(dateRange, formId || undefined);
  const { exportToExcel } = useExportFormLeadsExcel();

  const paginatedData = useMemo(() => {
    const start = page * ITEMS_PER_PAGE;
    return dailyData.slice(start, start + ITEMS_PER_PAGE);
  }, [dailyData, page]);

  const totalPages = Math.ceil(dailyData.length / ITEMS_PER_PAGE);

  const kpiCards = [
    { label: "Total Leads", value: kpis.totalLeads, icon: Users, color: "text-blue-500" },
    { label: "Deals Ganhos", value: kpis.totalWon, icon: TrendingUp, color: "text-green-500" },
    { label: "Taxa Conversão", value: `${kpis.conversionRate}%`, icon: Target, color: "text-amber-500" },
    { label: "Receita Total", value: `R$ ${kpis.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-emerald-500" },
  ];

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Leads Formulário vs Conversão</h1>
        </div>
        <Button onClick={() => exportToExcel(dailyData, kpis)} disabled={isLoading || dailyData.length === 0}>
          <Download className="h-4 w-4 mr-2" /> Exportar Excel
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
        <Select value={formId} onValueChange={setFormId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Todos os formulários" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os formulários</SelectItem>
            {forms?.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold">{kpi.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : dailyData.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              Nenhum dado encontrado para o período selecionado.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Ganhos</TableHead>
                    <TableHead className="text-right">Perdidos</TableHead>
                    <TableHead className="text-right">Conversão %</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((row) => (
                    <TableRow key={row.date}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell className="text-right">{row.leads}</TableCell>
                      <TableCell className="text-right">{row.won}</TableCell>
                      <TableCell className="text-right">{row.lost}</TableCell>
                      <TableCell className="text-right">{row.conversionRate}%</TableCell>
                      <TableCell className="text-right">
                        R$ {row.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    Página {page + 1} de {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                      Anterior
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
