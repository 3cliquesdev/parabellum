import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestResult {
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[test-octadesk] Starting connection test...');

  try {
    const OCTADESK_API_KEY = Deno.env.get("OCTADESK_API_KEY");
    const OCTADESK_BASE_URL = Deno.env.get("OCTADESK_BASE_URL");

    // Verificar se secrets estão configurados
    if (!OCTADESK_API_KEY) {
      console.error('[test-octadesk] OCTADESK_API_KEY not configured');
      const result: TestResult = {
        success: false,
        error: "OCTADESK_API_KEY não está configurada. Configure nas variáveis de ambiente.",
        details: {
          baseUrl: OCTADESK_BASE_URL || 'não configurada',
          apiKeyConfigured: false,
        }
      };
      return new Response(JSON.stringify(result), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!OCTADESK_BASE_URL) {
      console.error('[test-octadesk] OCTADESK_BASE_URL not configured');
      const result: TestResult = {
        success: false,
        error: "OCTADESK_BASE_URL não está configurada. Configure nas variáveis de ambiente.",
        details: {
          baseUrl: 'não configurada',
          apiKeyConfigured: true,
        }
      };
      return new Response(JSON.stringify(result), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[test-octadesk] Testing connection to: ${OCTADESK_BASE_URL}`);

    // Testar conexão com endpoint de salas (mais comum na API Octadesk)
    // Tentamos primeiro /chat/rooms, depois /rooms como fallback
    const endpoints = [
      '/chat/rooms?limit=1',
      '/rooms?limit=1',
      '/api/v1/chat/rooms?limit=1',
    ];

    let lastError: string | null = null;
    let lastStatus: number | null = null;

    for (const endpoint of endpoints) {
      const url = `${OCTADESK_BASE_URL}${endpoint}`;
      console.log(`[test-octadesk] Trying endpoint: ${url}`);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${OCTADESK_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        console.log(`[test-octadesk] Response status: ${response.status}`);
        lastStatus = response.status;

        if (response.ok) {
          const data = await response.json().catch(() => null);
          console.log('[test-octadesk] Connection successful!');
          
          const result: TestResult = {
            success: true,
            message: "Conexão com Octadesk estabelecida com sucesso!",
            details: {
              baseUrl: OCTADESK_BASE_URL,
              apiKeyConfigured: true,
              responseStatus: response.status,
              responseMessage: data ? `API respondeu corretamente` : 'API acessível',
            }
          };
          
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (response.status === 401 || response.status === 403) {
          lastError = 'API Key inválida ou sem permissão de acesso.';
          break; // Não tentar outros endpoints se for problema de auth
        }

        lastError = `Endpoint respondeu com status ${response.status}`;
      } catch (fetchError) {
        console.error(`[test-octadesk] Fetch error for ${endpoint}:`, fetchError);
        lastError = fetchError instanceof Error ? fetchError.message : 'Erro de conexão';
      }
    }

    // Nenhum endpoint funcionou
    console.error('[test-octadesk] All endpoints failed');
    
    let errorMessage = lastError || 'Não foi possível conectar à API do Octadesk';
    
    if (lastStatus === 401 || lastStatus === 403) {
      errorMessage = 'API Key inválida ou sem permissão. Verifique suas credenciais.';
    } else if (lastStatus === 404) {
      errorMessage = 'Base URL incorreta. Verifique o endereço da API.';
    }

    const result: TestResult = {
      success: false,
      error: errorMessage,
      details: {
        baseUrl: OCTADESK_BASE_URL,
        apiKeyConfigured: true,
        responseStatus: lastStatus || undefined,
      }
    };

    return new Response(JSON.stringify(result), {
      status: 200, // Retornamos 200 para que o cliente possa processar a resposta
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[test-octadesk] Unexpected error:', error);
    
    const result: TestResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Erro inesperado ao testar conexão',
    };

    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
