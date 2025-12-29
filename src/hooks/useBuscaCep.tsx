import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CepData {
  cep: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  complement: string;
}

export function useBuscaCep() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buscarCep = async (cep: string): Promise<CepData | null> => {
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) {
      setError('CEP deve ter 8 dígitos');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('busca-cep', {
        body: { cep: cleanCep },
      });

      if (fnError) throw fnError;
      
      if (data.error) {
        setError(data.error);
        return null;
      }

      return data as CepData;
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar CEP');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { buscarCep, isLoading, error };
}
