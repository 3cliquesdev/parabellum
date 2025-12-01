import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSalesReps } from "@/hooks/useSalesReps";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PendingDealsQueue() {
  const { toast } = useToast();
  const [assigningDealId, setAssigningDealId] = useState<string | null>(null);
  const { data: salesReps } = useSalesReps();

  const { data: pendingDeals, refetch } = useQuery({
    queryKey: ["pending-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select(`
          id,
          title,
          value,
          created_at,
          contacts (
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .is("assigned_to", null)
        .eq("status", "open")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    refetchInterval: 10000, // Atualiza a cada 10s
  });

  const handleAssign = async (dealId: string, salesRepId: string) => {
    try {
      setAssigningDealId(dealId);
      
      const { error } = await supabase
        .from("deals")
        .update({ assigned_to: salesRepId })
        .eq("id", dealId);

      if (error) throw error;

      toast({
        title: "Deal atribuído com sucesso",
        description: "O vendedor foi notificado",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Erro ao atribuir deal",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAssigningDealId(null);
    }
  };

  if (!pendingDeals || pendingDeals.length === 0) {
    return null;
  }

  return (
    <Card className="border-yellow-500/20 bg-yellow-500/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-yellow-600 dark:text-yellow-500">
              Fila Pendente
            </CardTitle>
            <CardDescription>
              Deals aguardando atribuição automática quando vendedores ficarem online
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-lg">
            {pendingDeals.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingDeals.map((deal) => (
            <div
              key={deal.id}
              className="flex items-center justify-between p-3 bg-background rounded-lg border"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{deal.title}</p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  {deal.contacts && (
                    <span className="truncate">
                      {deal.contacts.first_name} {deal.contacts.last_name}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(deal.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                {deal.value && (
                  <Badge variant="outline">
                    R$ {deal.value.toFixed(2)}
                  </Badge>
                )}
                
                <Select
                  disabled={assigningDealId === deal.id}
                  onValueChange={(value) => handleAssign(deal.id, value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Atribuir" />
                  </SelectTrigger>
                  <SelectContent>
                    {salesReps?.map((rep) => (
                      <SelectItem key={rep.id} value={rep.id}>
                        {rep.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          💡 Quando um vendedor ficar online, ele receberá automaticamente até 3 deals da fila
        </p>
      </CardContent>
    </Card>
  );
}
