import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  to: string;
  to_name: string;
  subject: string;
  html: string;
  customer_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, to_name, subject, html, customer_id }: SendEmailRequest = await req.json();

    console.log('[send-email] Request received:', { to, subject, customer_id });

    // Validação
    if (!to || !subject || !html || !customer_id) {
      console.error('[send-email] Missing fields:', { to: !!to, subject: !!subject, html: !!html, customer_id: !!customer_id });
      throw new Error('Missing required fields: to, subject, html, customer_id');
    }

    // Enviar email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('[send-email] RESEND_API_KEY not configured');
      throw new Error('RESEND_API_KEY not configured');
    }

    console.log('[send-email] Sending email via Resend API...');
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%); padding: 30px; text-align: center;">
              <img src="https://zaeozfdjhrmblfaxsyuu.supabase.co/storage/v1/object/public/avatars/logo-parabellum-email.png" 
                   alt="PARABELLUM" 
                   style="max-width: 200px; height: auto;" />
            </div>
            <div style="padding: 30px; background: #f8fafc;">
              ${html}
            </div>
            <div style="background: #1e3a5f; padding: 20px; text-align: center;">
              <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                Equipe - Parabellum
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Seu Armazém Drop <contato@parabellum.work>',
        to: [`${to_name} <${to}>`],
        subject,
        html: emailHtml,
        tags: [
          { name: 'customer_id', value: customer_id }
        ]
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error('[send-email] Resend API error:', errorData);
      throw new Error(`Resend API error: ${errorData}`);
    }

    const resendData = await resendResponse.json();
    console.log('[send-email] Email sent successfully:', resendData);

    // Registrar interação email_sent no Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: interactionError } = await supabase
      .from('interactions')
      .insert({
        customer_id,
        type: 'email_sent',
        content: `Email enviado: ${subject}`,
        channel: 'email',
        metadata: {
          email_id: resendData.id,
          to,
          subject,
        }
      });

    if (interactionError) {
      console.error('[send-email] Error inserting interaction:', interactionError);
      throw interactionError;
    }

    console.log('[send-email] Interaction registered successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_id: resendData.id,
        message: 'Email enviado e interação registrada'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[send-email] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});