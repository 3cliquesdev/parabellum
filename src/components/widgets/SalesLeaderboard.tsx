import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSalesLeaderboard } from "@/hooks/useSalesLeaderboard";
import { Trophy, TrendingUp, Flame } from "lucide-react";

const getMedalIcon = (position: number) => {
  switch (position) {
    case 0: return "🥇";
    case 1: return "🥈";
    case 2: return "🥉";
    default: return null;
  }
};

export function SalesLeaderboard() {
  const { data: leaderboard, isLoading } = useSalesLeaderboard();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Ranking de Vendas
          </CardTitle>
          <CardDescription>Carregando ranking...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Ranking de Vendas
          </CardTitle>
          <CardDescription>Mês atual</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma venda registrada neste mês ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Ranking de Vendas
        </CardTitle>
        <CardDescription>Top vendedores do mês</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {leaderboard.map((entry, index) => {
            const medal = getMedalIcon(index);
            const isTopThree = index < 3;

            return (
              <div
                key={entry.userId}
                className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                  isTopThree ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/50'
                }`}
              >
                {/* Position & Medal */}
                <div className="flex items-center justify-center w-8 text-lg font-bold">
                  {medal || `${index + 1}º`}
                </div>

                {/* Avatar */}
                <Avatar className="h-12 w-12">
                  <AvatarImage src={entry.avatarUrl || undefined} />
                  <AvatarFallback>
                    {entry.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{entry.fullName}</p>
                    {entry.hasRecentSale && (
                      <Flame className="h-4 w-4 text-orange-500 animate-pulse" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {entry.dealCount} {entry.dealCount === 1 ? 'venda' : 'vendas'}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {entry.conversionRate.toFixed(0)}%
                    </Badge>
                  </div>
                </div>

                {/* Total Sales */}
                <div className="text-right">
                  <p className={`font-bold ${isTopThree ? 'text-primary' : 'text-foreground'}`}>
                    {formatCurrency(entry.totalSales)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
