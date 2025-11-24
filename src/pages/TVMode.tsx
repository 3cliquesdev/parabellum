import { useEffect } from "react";
import { useSalesLeaderboard } from "@/hooks/useSalesLeaderboard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Flame, Trophy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RecentSale {
  id: string;
  title: string;
  value: number;
  sellerName: string;
  sellerAvatar: string | null;
  closedAt: string;
}

const getMedalIcon = (position: number) => {
  switch (position) {
    case 0: return "🥇";
    case 1: return "🥈";
    case 2: return "🥉";
    default: return null;
  }
};

export default function TVMode() {
  const { data: leaderboard, refetch: refetchLeaderboard } = useSalesLeaderboard();

  // Fetch recent won deals
  const { data: recentSales, refetch: refetchSales } = useQuery({
    queryKey: ["recent-sales-tv"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, value, closed_at, assigned_user:profiles!deals_assigned_to_fkey(full_name, avatar_url)")
        .eq("status", "won")
        .order("closed_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      return (data || []).map(deal => ({
        id: deal.id,
        title: deal.title,
        value: Number(deal.value || 0),
        sellerName: deal.assigned_user?.full_name || "Vendedor",
        sellerAvatar: deal.assigned_user?.avatar_url || null,
        closedAt: deal.closed_at || new Date().toISOString(),
      })) as RecentSale[];
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("🔄 TV Mode: Auto-refreshing data...");
      refetchLeaderboard();
      refetchSales();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [refetchLeaderboard, refetchSales]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 overflow-hidden">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-6xl font-bold mb-2 flex items-center justify-center gap-4">
          <Trophy className="h-16 w-16 text-yellow-500" />
          RANKING DE VENDAS
        </h1>
        <p className="text-2xl text-gray-400">Atualizado em tempo real</p>
      </div>

      <div className="grid grid-cols-[60%_40%] gap-8">
        {/* LEFT: Leaderboard */}
        <div className="space-y-6">
          {leaderboard?.slice(0, 8).map((entry, index) => {
            const medal = getMedalIcon(index);
            const isTopThree = index < 3;

            return (
              <div
                key={entry.userId}
                className={`flex items-center gap-6 p-6 rounded-xl ${
                  isTopThree ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-700/20 border-2 border-yellow-500' : 'bg-gray-900'
                }`}
              >
                {/* Position */}
                <div className="text-5xl font-bold w-16 text-center">
                  {medal || `${index + 1}º`}
                </div>

                {/* Avatar */}
                <Avatar className="h-20 w-20">
                  <AvatarImage src={entry.avatarUrl || undefined} />
                  <AvatarFallback className="text-2xl">
                    {entry.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-3xl font-bold">{entry.fullName}</p>
                    {entry.hasRecentSale && (
                      <Flame className="h-8 w-8 text-orange-500 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xl text-gray-400">
                    {entry.dealCount} {entry.dealCount === 1 ? 'venda' : 'vendas'} • {entry.conversionRate.toFixed(0)}% conversão
                  </p>
                </div>

                {/* Total */}
                <div className="text-right">
                  <p className="text-4xl font-bold text-green-400">
                    {formatCurrency(entry.totalSales)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT: Recent Sales Feed */}
        <div className="bg-gray-900 rounded-xl p-6">
          <h2 className="text-3xl font-bold mb-6 text-center">🎉 ÚLTIMAS VENDAS</h2>
          <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto">
            {recentSales?.map((sale) => (
              <div key={sale.id} className="bg-black/50 rounded-lg p-4 border border-green-500/30">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={sale.sellerAvatar || undefined} />
                    <AvatarFallback>
                      {sale.sellerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-lg font-semibold">{sale.sellerName}</p>
                    <p className="text-sm text-gray-400">
                      {formatDistanceToNow(new Date(sale.closedAt), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
                <p className="text-xl text-green-400 font-bold">
                  {formatCurrency(sale.value)}
                </p>
                <p className="text-sm text-gray-400 truncate">{sale.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
