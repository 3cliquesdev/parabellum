import { useState } from "react";
import { Package, RefreshCw, Truck, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TrackingWidgetProps {
  trackingCode: string | null;
  dealId: string;
}

interface TrackingData {
  tracking_code: string;
  platform: string | null;
  status: string | null;
  external_updated_at: string | null;
  fetched_at: string | null;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: "Pendente", icon: <Clock className="h-4 w-4" />, color: "bg-yellow-100 text-yellow-800" },
  shipped: { label: "Enviado", icon: <Package className="h-4 w-4" />, color: "bg-blue-100 text-blue-800" },
  in_transit: { label: "Em Trânsito", icon: <Truck className="h-4 w-4" />, color: "bg-purple-100 text-purple-800" },
  out_for_delivery: { label: "Saiu para Entrega", icon: <Truck className="h-4 w-4" />, color: "bg-indigo-100 text-indigo-800" },
  delivered: { label: "Entregue", icon: <CheckCircle className="h-4 w-4" />, color: "bg-green-100 text-green-800" },
  returned: { label: "Devolvido", icon: <AlertCircle className="h-4 w-4" />, color: "bg-orange-100 text-orange-800" },
  failed: { label: "Falha na Entrega", icon: <AlertCircle className="h-4 w-4" />, color: "bg-red-100 text-red-800" },
};

export default function TrackingWidget({ trackingCode, dealId }: TrackingWidgetProps) {
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTracking = async () => {
    if (!trackingCode) return;
    
    setLoading(true);
    setError(null);

    try {
      // Primeiro tenta do cache
      const { data: cached } = await supabase
        .from('tracking_cache')
        .select('*')
        .eq('tracking_code', trackingCode)
        .maybeSingle();

      // Se cache existe e é recente (menos de 30 min), usa
      if (cached && new Date(cached.fetched_at).getTime() > Date.now() - 30 * 60 * 1000) {
        setTrackingData({
          tracking_code: cached.tracking_code,
          platform: cached.platform,
          status: cached.status,
          external_updated_at: cached.external_updated_at,
          fetched_at: cached.fetched_at,
        });
        setLoading(false);
        return;
      }

      // Busca atualizado do MySQL externo
      const { data, error: fetchError } = await supabase.functions.invoke('fetch-tracking', {
        body: { tracking_code: trackingCode }
      });

      if (fetchError) throw fetchError;

      if (data?.success && data?.data?.[trackingCode]) {
        const info = data.data[trackingCode];
        setTrackingData({
          tracking_code: trackingCode,
          platform: info.platform,
          status: info.status,
          external_updated_at: info.updated_at,
          fetched_at: new Date().toISOString(),
        });
        toast.success("Rastreio atualizado!");
      } else {
        setError("Código de rastreio não encontrado no sistema externo");
      }
    } catch (err) {
      console.error("Erro ao buscar rastreio:", err);
      setError("Erro ao consultar rastreio");
      toast.error("Erro ao consultar rastreio");
    } finally {
      setLoading(false);
    }
  };

  if (!trackingCode) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            Rastreio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum código de rastreio cadastrado
          </p>
        </CardContent>
      </Card>
    );
  }

  const status = trackingData?.status?.toLowerCase();
  const config = status ? statusConfig[status] : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-600" />
            Rastreio
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchTracking}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
            {trackingCode}
          </span>
        </div>

        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        )}

        {error && !loading && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {trackingData && !loading && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Status:</span>
              {config ? (
                <Badge className={`${config.color} gap-1`}>
                  {config.icon}
                  {config.label}
                </Badge>
              ) : (
                <Badge variant="secondary">{trackingData.status || "Desconhecido"}</Badge>
              )}
            </div>
            
            {trackingData.platform && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Transportadora:</span>
                <span className="text-sm font-medium">{trackingData.platform}</span>
              </div>
            )}

            {trackingData.external_updated_at && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Atualizado:</span>
                <span className="text-xs">
                  {new Date(trackingData.external_updated_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
          </div>
        )}

        {!trackingData && !loading && !error && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={fetchTracking}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Consultar Rastreio
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
