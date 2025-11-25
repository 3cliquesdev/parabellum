import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useExpansionOpportunities } from "@/hooks/useExpansionOpportunities";
import { Target, TrendingUp, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ExpansionRadarWidget() {
  const { data: opportunities, isLoading } = useExpansionOpportunities();
  const navigate = useNavigate();

  const handleCreateProposal = (contactId: string) => {
    navigate(`/contacts/${contactId}`);
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Expansion Radar
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!opportunities || opportunities.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Expansion Radar
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[300px] text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Nenhuma oportunidade de upsell detectada no momento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Expansion Radar
          </div>
          <Badge variant="secondary" className="bg-primary/20 text-primary">
            {opportunities.length} {opportunities.length === 1 ? "Oportunidade" : "Oportunidades"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {opportunities.map((opp) => (
          <div
            key={opp.id}
            className="p-4 rounded-lg bg-background border border-border hover:border-primary/50 transition-all"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">
                    {opp.first_name} {opp.last_name}
                  </p>
                  {opp.company && (
                    <span className="text-xs text-muted-foreground">
                      • {opp.company}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {opp.subscription_plan || "Sem plano"}
                  </Badge>
                  {opp.recent_orders_count && opp.recent_orders_count > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {opp.recent_orders_count} pedidos
                    </span>
                  )}
                </div>
              </div>
              <Badge className="bg-primary text-primary-foreground whitespace-nowrap">
                +R$ {opp.estimated_commission.toFixed(2)}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              {opp.reason}
            </p>

            <Button 
              size="sm" 
              className="w-full"
              onClick={() => handleCreateProposal(opp.id)}
            >
              <TrendingUp className="h-3 w-3 mr-2" />
              Criar Proposta de Upgrade
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
