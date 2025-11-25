import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KnowledgeRow {
  input: string;
  output: string;
  category?: string;
  tags?: string;
}

interface ProcessRequest {
  rows: KnowledgeRow[];
  mode: 'raw_history' | 'ready_faq';
  source: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { rows, mode, source }: ProcessRequest = await req.json();
    
    const result = {
      created: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip empty rows
      if (!row.input || !row.output) {
        result.skipped++;
        continue;
      }

      try {
        let title = '';
        let content = '';

        if (mode === 'raw_history') {
          // Use AI to clean and extract
          const dialog = `${row.input}\n\n${row.output}`;
          
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'system',
                  content: `Você é um especialista em extrair conhecimento de conversas de suporte.

Dado o seguinte diálogo entre cliente e atendente, extraia:
1. O PROBLEMA/PERGUNTA central do cliente (resumido em 1 frase)
2. A SOLUÇÃO/RESPOSTA técnica (passo a passo se aplicável)

Remova:
- Cumprimentos ("bom dia", "oi", "obrigado")
- Frases genéricas ("aguarde um momento", "vou verificar")
- Informações pessoais

Retorne APENAS um JSON válido:
{
  "title": "Título conciso do problema",
  "content": "Solução detalhada e técnica"
}`
                },
                {
                  role: 'user',
                  content: dialog
                }
              ],
              response_format: { type: "json_object" }
            }),
          });

          if (!aiResponse.ok) {
            throw new Error(`AI API error: ${aiResponse.status}`);
          }

          const aiData = await aiResponse.json();
          const parsed = JSON.parse(aiData.choices[0].message.content);
          title = parsed.title || row.input.substring(0, 100);
          content = parsed.content || row.output;
        } else {
          // FAQ Pronto mode - direct import
          title = row.input.substring(0, 100);
          content = `Pergunta: ${row.input}\n\nResposta: ${row.output}`;
        }

        // Parse tags if present
        let tagsArray: string[] = ['importado', source];
        if (row.tags) {
          const additionalTags = row.tags.split(',').map(t => t.trim()).filter(Boolean);
          tagsArray = [...tagsArray, ...additionalTags];
        }

        // Insert into knowledge_articles
        const { error: insertError } = await supabaseClient
          .from('knowledge_articles')
          .insert({
            title,
            content,
            category: row.category || 'Importado',
            tags: tagsArray,
            is_published: true,
          });

        if (insertError) {
          result.errors.push({
            row: i + 1,
            error: insertError.message,
          });
        } else {
          result.created++;
        }

      } catch (error) {
        console.error(`Error processing row ${i + 1}:`, error);
        result.errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
