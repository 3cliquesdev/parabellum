import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTeamPerformance } from "@/hooks/useTeamPerformance";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, ArrowUpDown } from "lucide-react";
import { useState } from "react";

interface TeamPerformanceTableProps {
  startDate: Date;
  endDate: Date;
}

type SortField = "chatsAttended" | "avgResponseTime" | "avgCSAT" | "salesClosed" | "totalRevenue";

export function TeamPerformanceTable({ startDate, endDate }: TeamPerformanceTableProps) {
  const { data: team, isLoading } = useTeamPerformance(startDate, endDate);
  const [sortField, setSortField] = useState<SortField>("chatsAttended");
  const [sortDesc, setSortDesc] = useState(true);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(true);
    }
  };

  const sortedTeam = team ? [...team].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    return sortDesc ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
  }) : [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatTime = (minutes: number) => {
    if (minutes < 1) return `${Math.round(minutes * 60)}s`;
    if (minutes < 60) return `${minutes.toFixed(1)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getTopBadge = (index: number) => {
    if (index === 0) return { icon: "🥇", label: "1º Lugar", variant: "default" as const };
    if (index === 1) return { icon: "🥈", label: "2º Lugar", variant: "secondary" as const };
    if (index === 2) return { icon: "🥉", label: "3º Lugar", variant: "outline" as const };
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500 fill-yellow-500" />
          Raio-X da Equipe
        </CardTitle>
        <CardDescription>
          Performance detalhada de cada membro da equipe
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Membro</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("chatsAttended")}
                >
                  <div className="flex items-center gap-1">
                    Chats
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("avgResponseTime")}
                >
                  <div className="flex items-center gap-1">
                    Tempo Resp.
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("avgCSAT")}
                >
                  <div className="flex items-center gap-1">
                    CSAT
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("salesClosed")}
                >
                  <div className="flex items-center gap-1">
                    Vendas
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort("totalRevenue")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Receita
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTeam.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma atividade no período selecionado
                  </TableCell>
                </TableRow>
              ) : (
                sortedTeam.map((member, index) => {
                  const topBadge = getTopBadge(index);
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {topBadge ? topBadge.icon : index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback>
                              {member.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{member.name}</div>
                            {topBadge && (
                              <Badge variant={topBadge.variant} className="text-xs mt-1">
                                {topBadge.label}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{member.chatsAttended}</TableCell>
                      <TableCell>
                        {member.avgResponseTime > 0 ? formatTime(member.avgResponseTime) : "-"}
                      </TableCell>
                      <TableCell>
                        {member.totalCSATRatings > 0 ? (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{member.avgCSAT.toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">
                              ({member.totalCSATRatings})
                            </span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{member.salesClosed}</TableCell>
                      <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                        {member.totalRevenue > 0 ? formatCurrency(member.totalRevenue) : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
