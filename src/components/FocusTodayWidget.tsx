import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AlertCircle, UserCheck, MessageSquare, Calendar } from "lucide-react";

interface FocusItem {
  id: string;
  clientName: string;
  reason: string;
  priority: "critical" | "high" | "medium";
  icon: any;
}

export default function FocusTodayWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: focusItems, isLoading } = useQuery({
    queryKey: ["focus-today", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const items: FocusItem[] = [];

      // Fetch contacts with related data
      const { data: contacts, error } = await supabase
        .from("contacts")
        .select(`
          *,
          customer_journey_steps(id, completed),
          tickets(id, status, priority, created_at)
        `)
        .eq("consultant_id", user.id)
        .eq("status", "customer");

      if (error) throw error;

      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      contacts?.forEach((contact) => {
        const clientName = `${contact.first_name} ${contact.last_name}`;

        // 1. New arrivals (onboarding completed in last 3 days)
        const steps = contact.customer_journey_steps || [];
        const allCompleted = steps.length > 0 && steps.every((s: any) => s.completed);
        if (allCompleted && contact.created_at && new Date(contact.created_at) > threeDaysAgo) {
          items.push({
            id: contact.id,
            clientName,
            reason: "Novo cliente! Dê as boas-vindas.",
            priority: "high",
            icon: UserCheck,
          });
        }

        // 2. Critical tickets
        const criticalTickets = (contact.tickets || []).filter(
          (t: any) => t.status !== "resolved" && t.status !== "closed" && t.priority === "urgent"
        );
        if (criticalTickets.length > 0) {
          items.push({
            id: contact.id,
            clientName,
            reason: `${criticalTickets.length} ticket(s) crítico(s) aberto(s). Ligue agora!`,
            priority: "critical",
            icon: AlertCircle,
          });
        }

        // 3. No contact in >30 days
        if (!contact.last_contact_date || new Date(contact.last_contact_date) < thirtyDaysAgo) {
          items.push({
            id: contact.id,
            clientName,
            reason: "Sem contato há mais de 30 dias. Risco de churn!",
            priority: "high",
            icon: MessageSquare,
          });
        }

        // 4. Renewal approaching (placeholder - would need renewal_date field)
        // For now, skip this one
      });

      // Sort by priority: critical > high > medium
      const priorityOrder = { critical: 0, high: 1, medium: 2 };
      items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      // Limit to top 5
      return items.slice(0, 5);
    },
    enabled: !!user?.id,
  });

  const getPriorityColor = (priority: string) => {
    if (priority === "critical") return "destructive";
    if (priority === "high") return "default";
    return "secondary";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Foco do Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted rounded"></div>
            <div className="h-16 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Foco do Dia
        </CardTitle>
      </CardHeader>
      <CardContent>
        {focusItems && focusItems.length > 0 ? (
          <div className="space-y-3">
            {focusItems.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={`${item.id}-${item.reason}`} className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 mt-0.5 ${
                        item.priority === "critical" ? "text-destructive" : 
                        item.priority === "high" ? "text-yellow-500" : "text-muted-foreground"
                      }`} />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm">{item.clientName}</p>
                          <Badge variant={getPriorityColor(item.priority)} className="text-xs">
                            {item.priority === "critical" ? "Crítico" : 
                             item.priority === "high" ? "Alta" : "Média"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.reason}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/contacts/${item.id}`)}
                        >
                          Ver Cliente
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Tudo tranquilo por aqui! Nenhum cliente precisa de atenção urgente hoje.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
