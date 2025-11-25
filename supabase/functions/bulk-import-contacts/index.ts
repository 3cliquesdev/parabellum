import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactRow {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company?: string;
  document?: string;
  state_registration?: string;
  address?: string;
  address_number?: string;
  address_complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  birth_date?: string;
  customer_type?: string;
  blocked?: string | boolean;
  subscription_plan?: string;
  registration_date?: string;
  last_payment_date?: string;
  next_payment_date?: string;
  recent_orders_count?: string | number;
  account_balance?: string | number;
  assigned_to?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { contacts } = await req.json() as { contacts: ContactRow[] };

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid contacts array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Bulk Import] Processing ${contacts.length} contacts`);

    const results = {
      created: 0,
      updated: 0,
      errors: [] as Array<{ row: number; email: string; error: string }>,
    };

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];

      // Validação básica
      if (!contact.email || !contact.email.trim()) {
        results.errors.push({
          row: i + 1,
          email: contact.email || 'N/A',
          error: 'Email obrigatório',
        });
        continue;
      }

      // Verificar se contato existe
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', contact.email.toLowerCase().trim())
        .maybeSingle();

      const contactData = {
        email: contact.email.toLowerCase().trim(),
        first_name: contact.first_name?.trim() || '',
        last_name: contact.last_name?.trim() || '',
        phone: contact.phone?.trim() || null,
        company: contact.company?.trim() || null,
        document: contact.document?.trim() || null,
        state_registration: contact.state_registration?.trim() || null,
        address: contact.address?.trim() || null,
        address_number: contact.address_number?.trim() || null,
        address_complement: contact.address_complement?.trim() || null,
        neighborhood: contact.neighborhood?.trim() || null,
        city: contact.city?.trim() || null,
        state: contact.state?.trim() || null,
        zip_code: contact.zip_code?.trim() || null,
        birth_date: contact.birth_date || null,
        customer_type: contact.customer_type?.trim() || null,
        blocked: typeof contact.blocked === 'boolean' 
          ? contact.blocked 
          : (contact.blocked?.toLowerCase().trim() === 'sim' || contact.blocked?.toLowerCase().trim() === 'yes' || contact.blocked === '1'),
        subscription_plan: contact.subscription_plan?.trim() || null,
        registration_date: contact.registration_date || null,
        last_payment_date: contact.last_payment_date || null,
        next_payment_date: contact.next_payment_date || null,
        recent_orders_count: contact.recent_orders_count 
          ? parseInt(String(contact.recent_orders_count), 10) 
          : 0,
        account_balance: contact.account_balance 
          ? parseFloat(String(contact.account_balance).replace(',', '.')) 
          : 0,
        assigned_to: contact.assigned_to || null,
        source: 'csv_import',
        last_contact_date: new Date().toISOString(),
      };

      if (existingContact) {
        // Atualizar contato existente
        const { error: updateError } = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', existingContact.id);

        if (updateError) {
          console.error(`[Bulk Import] Error updating contact ${contact.email}:`, updateError);
          results.errors.push({
            row: i + 1,
            email: contact.email,
            error: updateError.message,
          });
        } else {
          results.updated++;
          console.log(`[Bulk Import] Updated contact: ${contact.email}`);
        }
      } else {
        // Criar novo contato
        const { error: insertError } = await supabase
          .from('contacts')
          .insert(contactData);

        if (insertError) {
          console.error(`[Bulk Import] Error creating contact ${contact.email}:`, insertError);
          results.errors.push({
            row: i + 1,
            email: contact.email,
            error: insertError.message,
          });
        } else {
          results.created++;
          console.log(`[Bulk Import] Created contact: ${contact.email}`);
        }
      }
    }

    console.log(`[Bulk Import] Completed: ${results.created} created, ${results.updated} updated, ${results.errors.length} errors`);

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Bulk Import] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
