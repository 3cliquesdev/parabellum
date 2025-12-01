import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KiwifySale {
  id: string;
  reference: string;
  status: 'paid' | 'refunded' | 'chargedback';
  net_amount: number;        // Valor líquido (centavos)
  product: { name: string; id: string };
  customer: { 
    email: string; 
    cpf?: string;
    cnpj?: string;
    mobile?: string;
    mobile_phone?: string;
    phone?: string;
  };
  commissions?: {
    product_base_price: number;
    my_commission?: number;
    kiwify_fee?: number;
    commissioned_stores?: Array<{ 
      type: string; 
      value: number;
      custom_name?: string;
      email?: string;
    }>;
  };
  created_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[sync-kiwify-sales] 🚀 Iniciando sincronização...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Buscar credenciais da API Kiwify do system_configurations
    const { data: configs } = await supabaseClient
      .from('system_configurations')
      .select('key, value')
      .in('key', ['kiwify_client_id', 'kiwify_client_secret', 'kiwify_account_id']);

    const clientId = configs?.find(c => c.key === 'kiwify_client_id')?.value;
    const clientSecret = configs?.find(c => c.key === 'kiwify_client_secret')?.value;
    const accountId = configs?.find(c => c.key === 'kiwify_account_id')?.value;

    if (!clientId || !clientSecret || !accountId) {
      throw new Error('Credenciais Kiwify não configuradas. Configure Client ID, Client Secret e Account ID em Configurações.');
    }

    console.log('[sync-kiwify-sales] ✅ Credenciais encontradas');

    // 2. Autenticar via OAuth
    console.log('[sync-kiwify-sales] 🔐 Autenticando via OAuth...');
    const authResponse = await fetch('https://api.kiwify.com/auth/oauth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      throw new Error(`Falha na autenticação Kiwify: ${authResponse.status} - ${errorText}`);
    }

    const { access_token } = await authResponse.json();
    console.log('[sync-kiwify-sales] ✅ Token OAuth obtido');

    // 3. Buscar todas as vendas
    console.log('[sync-kiwify-sales] 📥 Buscando vendas da API Kiwify...');
    let allSales: KiwifySale[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const salesResponse = await fetch(
        `https://api.kiwify.com/v1/sales?account_id=${accountId}&page=${page}&per_page=100`,
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!salesResponse.ok) {
        throw new Error(`Falha ao buscar vendas: ${salesResponse.status}`);
      }

      const salesData = await salesResponse.json();
      allSales = allSales.concat(salesData.data || []);
      
      hasMore = salesData.data && salesData.data.length === 100;
      page++;
    }

    console.log(`[sync-kiwify-sales] ✅ ${allSales.length} vendas encontradas`);

    // 4. Processar cada venda
    let updated = 0;
    let created = 0;
    let errors = 0;

    for (const sale of allSales) {
      try {
        // Buscar contato pelo email
        const { data: contact } = await supabaseClient
          .from('contacts')
          .select('id, phone, document')
          .eq('email', sale.customer.email)
          .single();

        if (!contact) {
          console.log(`[sync-kiwify-sales] ⚠️ Contato não encontrado: ${sale.customer.email}`);
          continue;
        }

        // Calcular valores financeiros
        const grossValue = (sale.commissions?.product_base_price || 0) / 100;
        const netValue = (sale.commissions?.my_commission || sale.net_amount || 0) / 100;
        const kiwifyFee = (sale.commissions?.kiwify_fee || 0) / 100;
        const affiliateCommission = (
          sale.commissions?.commissioned_stores?.find(s => s.type === 'affiliate')?.value || 0
        ) / 100;

        // Atualizar telefone se vazio
        const customerPhone = sale.customer.mobile || sale.customer.mobile_phone || sale.customer.phone;
        if (customerPhone && !contact.phone) {
          await supabaseClient
            .from('contacts')
            .update({ phone: customerPhone })
            .eq('id', contact.id);
        }

        // Atualizar CPF/CNPJ se vazio
        const customerDoc = sale.customer.cpf || sale.customer.cnpj;
        if (customerDoc && !contact.document) {
          await supabaseClient
            .from('contacts')
            .update({ document: customerDoc })
            .eq('id', contact.id);
        }

        // Buscar ou criar deal
        const dealTitle = `${sale.product.name} - Kiwify #${sale.reference}`;
        const { data: existingDeal } = await supabaseClient
          .from('deals')
          .select('id')
          .eq('contact_id', contact.id)
          .ilike('title', `%${sale.product.name}%`)
          .single();

        const dealData = {
          contact_id: contact.id,
          title: dealTitle,
          value: netValue,
          gross_value: grossValue,
          net_value: netValue,
          kiwify_fee: kiwifyFee,
          affiliate_commission: affiliateCommission,
          status: sale.status === 'paid' ? 'won' : sale.status === 'refunded' ? 'lost' : 'won',
          currency: 'BRL',
          closed_at: sale.created_at,
        };

        if (existingDeal) {
          await supabaseClient
            .from('deals')
            .update(dealData)
            .eq('id', existingDeal.id);
          updated++;
        } else {
          // Buscar pipeline padrão
          const { data: pipeline } = await supabaseClient
            .from('pipelines')
            .select('id')
            .limit(1)
            .single();

          await supabaseClient
            .from('deals')
            .insert({ ...dealData, pipeline_id: pipeline?.id });
          created++;
        }

      } catch (err: any) {
        console.error(`[sync-kiwify-sales] ❌ Erro ao processar venda ${sale.reference}:`, err.message);
        errors++;
      }
    }

    console.log('[sync-kiwify-sales] ✅ Sincronização concluída');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sincronização concluída com sucesso',
        stats: {
          total_sales: allSales.length,
          updated,
          created,
          errors,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[sync-kiwify-sales] ❌ ERROR:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
