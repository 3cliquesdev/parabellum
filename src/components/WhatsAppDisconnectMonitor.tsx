import { useState, useEffect } from 'react';
import { useWhatsAppInstanceRealtime } from '@/hooks/useWhatsAppInstanceRealtime';
import { useWhatsAppInstances } from '@/hooks/useWhatsAppInstances';
import { AlertTriangle, Wifi, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Componente que monitora desconexões de WhatsApp em tempo real
 * e exibe banner persistente quando instâncias estão desconectadas.
 * 
 * Deve ser montado uma vez no layout principal (App.tsx ou similar).
 */
export function WhatsAppDisconnectMonitor() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  
  // Ativar subscription global de WhatsApp
  useWhatsAppInstanceRealtime();
  
  // Buscar status das instâncias
  const { data: instances } = useWhatsAppInstances();
  
  // Verificar instâncias desconectadas
  const disconnectedInstances = instances?.filter(
    i => i.status === 'disconnected' || i.status === 'error'
  ) || [];
  
  const hasDisconnected = disconnectedInstances.length > 0;
  
  // Reset dismissed quando reconectar
  useEffect(() => {
    if (!hasDisconnected) {
      setDismissed(false);
    }
  }, [hasDisconnected]);
  
  // Não mostrar se não há desconexão ou foi dispensado
  if (!hasDisconnected || dismissed) {
    return null;
  }
  
  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-50",
      "bg-red-600 text-white px-4 py-2",
      "flex items-center justify-center gap-3",
      "shadow-lg animate-in slide-in-from-top duration-300"
    )}>
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm font-medium">
        {disconnectedInstances.length === 1 
          ? `WhatsApp "${disconnectedInstances[0].name}" desconectado` 
          : `${disconnectedInstances.length} instâncias WhatsApp desconectadas`
        }
      </span>
      <Button
        variant="secondary"
        size="sm"
        className="h-7 gap-1.5 bg-white/20 hover:bg-white/30 text-white border-0"
        onClick={() => navigate('/whatsapp-instances')}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Reconectar
      </Button>
      <button 
        onClick={() => setDismissed(true)}
        className="p-1 hover:bg-white/20 rounded ml-2"
        aria-label="Dispensar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
