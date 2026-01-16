import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skull, CalendarPlus, XCircle, AlertTriangle, AlertOctagon, Flame } from "lucide-react";
import { useRottenDeals } from "@/hooks/useRottenDeals";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import LostReasonDialog from "@/components/LostReasonDialog";
import { useUpdateDeal } from "@/hooks/useDeals";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type UrgencyLevel = "warning" | "critical" | "escalation";

function getUrgencyLevel(daysSinceUpdate: number): UrgencyLevel {
  if (daysSinceUpdate >= 21) return "escalation";
  if (daysSinceUpdate >= 14) return "critical";
  return "warning";
}

function getUrgencyConfig(level: UrgencyLevel) {
  switch (level) {
    case "escalation":
      return {
        icon: Flame,
        badgeClass: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
        borderClass: "border-slate-900 dark:border-slate-100",
        label: "Escalado",
      };
    case "critical":
      return {
        icon: AlertOctagon,
        badgeClass: "bg-destructive text-destructive-foreground",
        borderClass: "border-destructive",
        label: "Crítico",
      };
    default:
      return {
        icon: AlertTriangle,
        badgeClass: "bg-amber-500 text-white",
        borderClass: "border-amber-500",
        label: "Atenção",
      };
  }
}

export default function RottenDealsWidget() {
  const { data: rottenDeals, isLoading } = useRottenDeals();
  const navigate = useNavigate();
  const { user } = useAuth();
  const updateDeal = useUpdateDeal();
  const queryClient = useQueryClient();
  
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<typeof rottenDeals extends (infer T)[] | undefined ? T : never | null>(null);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTitle, setFollowUpTitle] = useState("Follow-up");

  const handleMarkAsLost = (deal: NonNullable<typeof selectedDeal>) => {
    setSelectedDeal(deal);
    setLostDialogOpen(true);
  };

  const handleScheduleFollowUp = (deal: NonNullable<typeof selectedDeal>) => {
    setSelectedDeal(deal);
    setFollowUpTitle(`Follow-up: ${deal.title}`);
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFollowUpDate(tomorrow.toISOString().split("T")[0]);
    setFollowUpDialogOpen(true);
  };

  const confirmLost = async (reason: string, notes?: string) => {
    if (!selectedDeal) return;
    
    try {
      await updateDeal.mutateAsync({
        id: selectedDeal.id,
        updates: {
          status: "lost",
          lost_reason: reason,
          closed_at: new Date().toISOString(),
        },
      });
      toast.success("Negócio marcado como perdido");
      setLostDialogOpen(false);
      setSelectedDeal(null);
    } catch (error) {
      toast.error("Erro ao atualizar negócio");
    }
  };

  const confirmFollowUp = async () => {
    if (!selectedDeal || !user?.id || !followUpDate) return;

    try {
      const { error } = await supabase.from("activities").insert({
        title: followUpTitle,
        type: "task" as const,
        deal_id: selectedDeal.id,
        contact_id: selectedDeal.contact_id || null,
        assigned_to: user.id,
        due_date: new Date(followUpDate).toISOString(),
      });

      // Update the deal's updated_at to remove it from rotten list
      await supabase
        .from("deals")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", selectedDeal.id);

      toast.success("Follow-up agendado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["rotten-deals"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setFollowUpDialogOpen(false);
      setSelectedDeal(null);
    } catch (error) {
      toast.error("Erro ao agendar follow-up");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skull className="h-5 w-5 text-destructive" />
            Negócios Estagnados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const topRottenDeals = rottenDeals?.slice(0, 5) || [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skull className="h-5 w-5 text-destructive" />
            Negócios Estagnados
            {rottenDeals && rottenDeals.length > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {rottenDeals.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topRottenDeals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum negócio estagnado! 🎉
            </p>
          ) : (
            <div className="space-y-3">
              {topRottenDeals.map((deal) => {
                const urgencyLevel = getUrgencyLevel(deal.daysSinceUpdate);
                const urgencyConfig = getUrgencyConfig(urgencyLevel);
                const UrgencyIcon = urgencyConfig.icon;

                return (
                  <div
                    key={deal.id}
                    className={`p-3 rounded-lg border-2 ${urgencyConfig.borderClass} bg-card cursor-pointer hover:bg-accent/50 transition-colors`}
                    onClick={() => navigate(`/deals?dealId=${deal.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <UrgencyIcon className="h-4 w-4 shrink-0" />
                          <p className="font-medium text-sm truncate">{deal.title}</p>
                        </div>
                        {deal.contacts && (
                          <p className="text-xs text-muted-foreground truncate ml-6">
                            {deal.contacts.first_name} {deal.contacts.last_name}
                          </p>
                        )}
                      </div>
                      <Badge className={`text-xs whitespace-nowrap ${urgencyConfig.badgeClass}`}>
                        {deal.daysSinceUpdate}d - {urgencyConfig.label}
                      </Badge>
                    </div>
                    
                    {deal.value && (
                      <p className="text-sm font-semibold text-success mt-1 ml-6">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: deal.currency || "BRL",
                        }).format(deal.value)}
                      </p>
                    )}

                    {/* Quick Actions */}
                    <div className="flex gap-2 mt-2 ml-6" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs flex-1"
                        onClick={() => handleScheduleFollowUp(deal)}
                      >
                        <CalendarPlus className="h-3 w-3 mr-1" />
                        Follow-up
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs flex-1"
                        onClick={() => handleMarkAsLost(deal)}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Perdido
                      </Button>
                    </div>
                  </div>
                );
              })}
              {rottenDeals && rottenDeals.length > 5 && (
                <button
                  onClick={() => navigate("/deals?filter=rotten")}
                  className="w-full text-sm text-primary hover:underline mt-2"
                >
                  Ver todos ({rottenDeals.length})
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lost Reason Dialog */}
      <LostReasonDialog
        open={lostDialogOpen}
        onClose={() => {
          setLostDialogOpen(false);
          setSelectedDeal(null);
        }}
        onConfirm={confirmLost}
        dealTitle={selectedDeal?.title || ""}
      />

      {/* Follow-up Dialog */}
      <Dialog open={followUpDialogOpen} onOpenChange={setFollowUpDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agendar Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="followup-title">Título</Label>
              <Input
                id="followup-title"
                value={followUpTitle}
                onChange={(e) => setFollowUpTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="followup-date">Data</Label>
              <Input
                id="followup-date"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUpDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmFollowUp} disabled={!followUpDate}>
              Agendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
