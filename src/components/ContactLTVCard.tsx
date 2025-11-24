import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Target } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface ContactLTVCardProps {
  contact: Tables<"contacts">;
  deals: Tables<"deals">[];
}

export default function ContactLTVCard({ contact, deals }: ContactLTVCardProps) {
  const totalLTV = contact.total_ltv || 0;
  const wonDeals = deals.filter(d => d.status === "won");
  const openDeals = deals.filter(d => d.status === "open");
  
  const potentialRevenue = openDeals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-500" />
          <CardTitle className="text-base">Lifetime Value</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* LTV Total */}
        <div>
          <p className="text-xs text-muted-foreground uppercase mb-1">
            Total Gerado
          </p>
          <p className="text-2xl font-bold text-green-500">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(totalLTV)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {wonDeals.length} {wonDeals.length === 1 ? "negócio ganho" : "negócios ganhos"}
          </p>
        </div>

        {/* Pipeline Potencial */}
        {potentialRevenue > 0 && (
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground uppercase mb-1">
              Pipeline Ativo
            </p>
            <p className="text-xl font-semibold text-primary">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(potentialRevenue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {openDeals.length} {openDeals.length === 1 ? "negócio em aberto" : "negócios em aberto"}
            </p>
          </div>
        )}

        {/* Empty State */}
        {totalLTV === 0 && potentialRevenue === 0 && (
          <div className="text-center py-4">
            <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum negócio ainda
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
