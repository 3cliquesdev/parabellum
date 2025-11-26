import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { email, code } = await req.json();

    if (!email || !code) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Email e código são obrigatórios' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[verify-code] Verificando código para:', email);

    // Buscar código mais recente não verificado
    const { data: verification, error: fetchError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('email', email)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !verification) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Nenhum código pendente encontrado' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se código expirou
    if (new Date(verification.expires_at) < new Date()) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Código expirado. Solicite um novo.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar tentativas máximas
    if (verification.attempts >= 3) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Máximo de tentativas excedido. Solicite um novo código.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar código
    if (verification.code !== code) {
      // Incrementar tentativas
      await supabase
        .from('email_verifications')
        .update({ attempts: verification.attempts + 1 })
        .eq('id', verification.id);

      return new Response(JSON.stringify({ 
        success: false,
        error: `Código incorreto. Tentativas restantes: ${2 - verification.attempts}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Código correto! Marcar como verificado
    await supabase
      .from('email_verifications')
      .update({ verified: true })
      .eq('id', verification.id);

    // Buscar contact_id associado ao email
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', email)
      .single();

    console.log('[verify-code] ✅ Código verificado com sucesso');

    return new Response(JSON.stringify({ 
      success: true,
      contact_id: contact?.id || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[verify-code] Erro:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
