import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OctadeskConnectionResult {
  success: boolean;
  message?: string;
  error?: string;
  details?: {
    baseUrl: string;
    apiKeyConfigured: boolean;
    responseStatus?: number;
    responseMessage?: string;
  };
}

export function useTestOctadeskConnection() {
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<OctadeskConnectionResult | null>(null);

  const testConnection = useCallback(async () => {
    setIsTesting(true);
    setResult(null);

    try {
      console.log('[useTestOctadeskConnection] Testing connection...');
      
      const { data, error } = await supabase.functions.invoke('test-octadesk', {
        method: 'POST',
      });

      if (error) {
        console.error('[useTestOctadeskConnection] Edge function error:', error);
        setResult({
          success: false,
          error: error.message || 'Erro ao conectar com o servidor',
        });
        return;
      }

      console.log('[useTestOctadeskConnection] Response:', data);
      setResult(data as OctadeskConnectionResult);
      
    } catch (err) {
      console.error('[useTestOctadeskConnection] Unexpected error:', err);
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'Erro inesperado',
      });
    } finally {
      setIsTesting(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  return {
    testConnection,
    isTesting,
    result,
    clearResult,
    isConnected: result?.success === true,
    hasError: result?.success === false,
  };
}
