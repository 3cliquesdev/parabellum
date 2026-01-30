import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper para buscar modelo AI configurado
async function getConfiguredAIModel(supabase: any): Promise<string> {
  try {
    const { data } = await supabase
      .from('system_configurations')
      .select('value')
      .eq('key', 'ai_model_analysis')
      .single();
    return data?.value || 'openai/gpt-5-mini';
  } catch {
    return 'openai/gpt-5-mini';
  }
}

// Gerar embedding usando OpenAI
async function generateEmbedding(text: string): Promise<number[] | null> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    console.log('[ai-auto-trainer] OPENAI_API_KEY not configured, skipping embedding');
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000), // Limitar tamanho
      }),
    });

    if (!response.ok) {
      console.error('[ai-auto-trainer] Embedding error:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('[ai-auto-trainer] Embedding generation failed:', error);
    return null;
  }
}

// Verificar se artigo já existe (similaridade > 95%)
async function checkDuplicate(supabase: any, embedding: number[]): Promise<{ isDuplicate: boolean; similarTo?: string }> {
  try {
    const { data, error } = await supabase.rpc('search_similar_articles', {
      query_embedding: embedding,
      match_threshold: 0.95,
      match_count: 1,
    });

    if (error) {
      console.error('[ai-auto-trainer] Duplicate check error:', error);
      return { isDuplicate: false };
    }

    if (data && data.length > 0) {
      return { isDuplicate: true, similarTo: data[0].title };
    }

    return { isDuplicate: false };
  } catch {
    return { isDuplicate: false };
  }
}

// 🆕 FASE 2: Minerar conhecimento de conversa bem-sucedida (CSAT >= 4)
async function mineSuccessConversation(
  supabase: any,
  conversationId: string,
  aiModel: string,
  LOVABLE_API_KEY: string,
  departmentId?: string
): Promise<{ items: any[]; skipped: boolean; reason?: string; confidence?: number; reasoning?: string }> {
  // Buscar mensagens da conversa
  const { data: messages, error } = await supabase
    .from('messages')
    .select('content, sender_type, is_ai_generated, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error || !messages || messages.length < 3) {
    return { items: [], skipped: true, reason: 'insufficient_messages' };
  }

  // Verificar se teve intervenção humana (pelo menos 1 mensagem de agente não-IA)
  const hasHumanAgent = messages.some((m: any) => 
    m.sender_type === 'user' && !m.is_ai_generated
  );
  
  if (!hasHumanAgent) {
    return { items: [], skipped: true, reason: 'no_human_intervention' };
  }

  // Construir transcript
  const transcript = messages.map((m: any) => 
    `${m.sender_type === 'user' ? 'AGENTE' : 'CLIENTE'}: ${m.content}`
  ).join('\n');

  if (transcript.length < 100) {
    return { items: [], skipped: true, reason: 'transcript_too_short' };
  }

  try {
    // 🆕 FASE 2: Prompt estruturado
    const structuredPrompt = `Você é um Agente de Extração de Conhecimento.

Analise este atendimento BEM-SUCEDIDO (CSAT >= 4) e extraia conhecimento REUTILIZÁVEL.

IGNORE COMPLETAMENTE:
- Saudações, agradecimentos, despedidas
- Informações específicas do cliente (nome, CPF, pedido)
- Contexto pessoal ou emocional
- Promessas ou exceções feitas para este cliente

EXTRAIA APENAS:
- Procedimentos técnicos explicados
- Regras de negócio mencionadas
- Soluções para problemas recorrentes
- Políticas da empresa

RETORNE JSON ESTRUTURADO:
{
  "extracted_items": [
    {
      "problem": "Problema em 1 frase clara (máx 150 caracteres)",
      "solution": "Solução objetiva e completa (máx 500 caracteres)",
      "when_to_use": "Quando aplicar esta solução",
      "when_not_to_use": "Quando NÃO aplicar (exceções)",
      "tags": ["tag1", "tag2"],
      "category": "Categoria apropriada"
    }
  ],
  "confidence_score": 0-100,
  "reasoning": "Por que você extraiu isso"
}

Se não houver conhecimento útil, retorne: { "extracted_items": [], "confidence_score": 0, "reasoning": "Sem conhecimento extraível" }`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: 'system', content: structuredPrompt },
          { role: 'user', content: `TRANSCRIPT:\n${transcript.substring(0, 10000)}` }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error('[ai-auto-trainer] AI response error:', response.status);
      return { items: [], skipped: true, reason: 'ai_error' };
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '{}';
    
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      console.error('[ai-auto-trainer] Failed to parse AI response');
      return { items: [], skipped: true, reason: 'parse_error' };
    }

    return {
      items: parsed.extracted_items || [],
      skipped: false,
      confidence: parsed.confidence_score,
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    console.error('[ai-auto-trainer] Mining error:', error);
    return { items: [], skipped: true, reason: 'exception' };
  }
}

// Minerar correção de falha (fallback + resposta humana)
async function mineFailureCorrection(
  supabase: any,
  conversationId: string,
  aiModel: string,
  LOVABLE_API_KEY: string
): Promise<{ item: any | null; skipped: boolean; reason?: string }> {
  const { data: messages, error } = await supabase
    .from('messages')
    .select('content, sender_type, is_ai_generated, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error || !messages) {
    return { item: null, skipped: true, reason: 'no_messages' };
  }

  // Encontrar mensagem de fallback
  const fallbackPatterns = ['especialista', 'humano', 'atendente', 'transferir'];
  const fallbackIndex = messages.findIndex((m: any) => 
    m.is_ai_generated && 
    fallbackPatterns.some(p => m.content?.toLowerCase().includes(p))
  );

  if (fallbackIndex === -1) {
    return { item: null, skipped: true, reason: 'no_fallback_found' };
  }

  // Mensagem do cliente ANTES do fallback
  const customerQuestion = messages
    .slice(0, fallbackIndex)
    .filter((m: any) => m.sender_type === 'contact')
    .pop()?.content;

  // Resposta do agente humano APÓS o fallback
  const humanResponse = messages
    .slice(fallbackIndex + 1)
    .find((m: any) => m.sender_type === 'user' && !m.is_ai_generated)?.content;

  if (!customerQuestion || !humanResponse) {
    return { item: null, skipped: true, reason: 'missing_context' };
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          {
            role: 'system',
            content: `Você é um Agente de Correção de IA. A IA não soube responder uma pergunta e um humano resolveu.

SUA TAREFA:
Crie uma regra de conhecimento para que a IA saiba responder da próxima vez.

RETORNE JSON VÁLIDO:
{
  "question": "Pergunta reformulada de forma clara e genérica",
  "answer": "Resposta completa baseada no que o humano explicou",
  "category": "Categoria apropriada",
  "confidence_score": 0-100,
  "reasoning": "Por que esta regra é útil"
}`
          },
          {
            role: 'user',
            content: `PERGUNTA DO CLIENTE:\n${customerQuestion}\n\nRESPOSTA DO HUMANO:\n${humanResponse}`
          }
        ],
      }),
    });

    if (!response.ok) {
      return { item: null, skipped: true, reason: 'ai_error' };
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '{}';
    
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      return { item: null, skipped: true, reason: 'parse_error' };
    }

    return {
      item: {
        question: parsed.question,
        answer: parsed.answer,
        category: parsed.category,
        confidence_score: parsed.confidence_score,
        reasoning: parsed.reasoning,
      },
      skipped: false,
    };
  } catch (error) {
    console.error('[ai-auto-trainer] Failure mining error:', error);
    return { item: null, skipped: true, reason: 'exception' };
  }
}

// 🆕 FASE 2: Salvar em knowledge_candidates (NÃO diretamente na KB)
async function saveKnowledgeCandidate(
  supabase: any,
  item: any,
  source: string,
  conversationId?: string,
  departmentId?: string
): Promise<{ created: boolean; status: string; candidateId?: string; skipped?: boolean; reason?: string; confidence?: number }> {
  const confidence = item.confidence_score || 0;
  
  // 🆕 FASE 2: Descartar se confiança < 70
  if (confidence < 70) {
    console.log(`[ai-auto-trainer] Baixa confiança ${confidence}, descartando`);
    return { created: false, status: 'discarded', skipped: true, reason: 'low_confidence', confidence };
  }

  // Verificar duplicata via embedding (opcional)
  const textForEmbedding = `${item.problem || item.question}\n${item.solution || item.answer}`;
  const embedding = await generateEmbedding(textForEmbedding);

  if (embedding) {
    const { isDuplicate, similarTo } = await checkDuplicate(supabase, embedding);
    if (isDuplicate) {
      console.log(`[ai-auto-trainer] Duplicata detectada: similar a "${similarTo}"`);
      return { created: false, status: 'duplicate', skipped: true, reason: `Similar a: ${similarTo}` };
    }
  }

  // 🆕 FASE 2: Salvar como candidato pendente (NUNCA diretamente na KB)
  const { data: candidate, error } = await supabase
    .from('knowledge_candidates')
    .insert({
      problem: (item.problem || item.question || '').substring(0, 500),
      solution: (item.solution || item.answer || '').substring(0, 2000),
      when_to_use: item.when_to_use?.substring(0, 500) || null,
      when_not_to_use: item.when_not_to_use?.substring(0, 500) || null,
      category: item.category || 'Auto-Aprendizado',
      tags: item.tags || [source, 'pending_review'],
      source_conversation_id: conversationId || null,
      department_id: departmentId || null,
      confidence_score: confidence,
      extracted_by: source,
      status: 'pending', // 🆕 SEMPRE pendente para curadoria
    })
    .select()
    .single();

  if (error) {
    console.error('[ai-auto-trainer] Save candidate error:', error);
    return { created: false, status: 'error', reason: error.message };
  }

  console.log(`[ai-auto-trainer] Candidato salvo: ${candidate.id} (pending, confidence: ${confidence})`);

  return {
    created: true,
    status: 'pending',
    candidateId: candidate.id,
    confidence: confidence,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!LOVABLE_API_KEY) {
    console.error('[ai-auto-trainer] LOVABLE_API_KEY not configured');
    return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const startTime = Date.now();

  console.log('[ai-auto-trainer] ⏰ Iniciando execução...');

  // Buscar modelo AI configurado
  const aiModel = await getConfiguredAIModel(supabase);
  console.log(`[ai-auto-trainer] Usando modelo: ${aiModel}`);

  // Janela de tempo: última hora
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  let articlesPublished = 0;
  let articlesAsDraft = 0;
  let skippedDuplicates = 0;
  let skippedLowConfidence = 0;
  let conversationsProcessed = 0;
  let failuresProcessed = 0;

  try {
    // ===== FONTE 1: SUCESSOS HUMANOS =====
    console.log('[ai-auto-trainer] 📊 Buscando conversas bem-sucedidas...');
    
    // 🆕 FASE 2: Buscar conversas fechadas COM CSAT >= 4 (obrigatório)
    const { data: successConversations, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        status,
        closed_at,
        department,
        conversation_ratings(rating)
      `)
      .eq('status', 'closed')
      .gte('closed_at', oneHourAgo)
      .limit(20);

    if (convError) {
      console.error('[ai-auto-trainer] Erro buscando conversas:', convError);
    }

    // 🆕 FASE 2: Critérios rigorosos de elegibilidade
    const eligibleConversations = (successConversations || []).filter((c: any) => {
      const rating = c.conversation_ratings?.[0]?.rating;
      
      // Critério 1: CSAT >= 4 (OBRIGATÓRIO)
      if (!rating || rating < 4) {
        console.log(`[ai-auto-trainer] Conversa ${c.id} pulada: CSAT ${rating || 'null'} < 4`);
        return false;
      }
      
      // Critério 2: Status fechado
      if (c.status !== 'closed') {
        return false;
      }
      
      return true;
    });

    console.log(`[ai-auto-trainer] Encontradas ${eligibleConversations.length} conversas elegíveis (CSAT >= 4)`);

    for (const conv of eligibleConversations) {
      conversationsProcessed++;
      const result = await mineSuccessConversation(supabase, conv.id, aiModel, LOVABLE_API_KEY, conv.department);
      
      if (result.skipped) {
        console.log(`[ai-auto-trainer] Conversa ${conv.id} pulada: ${result.reason}`);
        continue;
      }

      for (const item of result.items) {
        if (!item.problem && !item.question) continue;
        if (!item.solution && !item.answer) continue;

        // 🆕 FASE 2: Salvar como candidato, não diretamente na KB
        const saveResult = await saveKnowledgeCandidate(supabase, item, 'auto_mining_success', conv.id, conv.department);
        
        if (saveResult.created) {
          articlesAsDraft++; // Agora sempre vai para curadoria
        } else if (saveResult.reason?.includes('Similar')) {
          skippedDuplicates++;
        } else if (saveResult.status === 'discarded') {
          skippedLowConfidence++;
        }
      }
    }

    // ===== FONTE 2: CORREÇÃO DE FALHAS =====
    console.log('[ai-auto-trainer] 🔧 Buscando conversas com fallback...');
    
    // Buscar mensagens com padrão de fallback
    const { data: fallbackMessages, error: fallbackError } = await supabase
      .from('messages')
      .select('conversation_id')
      .eq('is_ai_generated', true)
      .or('content.ilike.%especialista%,content.ilike.%humano%,content.ilike.%transferir%')
      .gte('created_at', oneHourAgo)
      .limit(20);

    if (fallbackError) {
      console.error('[ai-auto-trainer] Erro buscando fallbacks:', fallbackError);
    }

    // Unique conversation IDs
    const fallbackConvIds = [...new Set((fallbackMessages || []).map((m: any) => m.conversation_id))];
    console.log(`[ai-auto-trainer] Encontradas ${fallbackConvIds.length} conversas com fallback`);

    for (const convId of fallbackConvIds) {
      failuresProcessed++;
      const result = await mineFailureCorrection(supabase, convId, aiModel, LOVABLE_API_KEY);
      
      if (result.skipped || !result.item) {
        console.log(`[ai-auto-trainer] Fallback ${convId} pulado: ${result.reason}`);
        continue;
      }

      // 🆕 FASE 2: Salvar como candidato também para correções
      const saveResult = await saveKnowledgeCandidate(supabase, result.item, 'auto_mining_failure_fix', convId);
      
      if (saveResult.created) {
        articlesAsDraft++;
      } else if (saveResult.reason?.includes('Similar')) {
        skippedDuplicates++;
      } else if (saveResult.status === 'discarded') {
        skippedLowConfidence++;
      }
    }

    // ===== AUDITORIA =====
    const executionTime = Date.now() - startTime;
    const summary = {
      articles_published: articlesPublished,
      articles_as_draft: articlesAsDraft,
      duplicates_skipped: skippedDuplicates,
      low_confidence_skipped: skippedLowConfidence,
      success_conversations_processed: conversationsProcessed,
      failure_corrections_processed: failuresProcessed,
      execution_time_ms: executionTime,
      executed_at: new Date().toISOString(),
      ai_model: aiModel,
    };

    const { error: auditError } = await supabase.from('audit_logs').insert({
      action: 'ai_auto_training',
      table_name: 'knowledge_articles',
      new_data: summary,
    });

    if (auditError) {
      console.error('[ai-auto-trainer] Erro salvando audit_log:', auditError);
    } else {
      console.log('[ai-auto-trainer] Audit log salvo com sucesso');
    }

    console.log('[ai-auto-trainer] ✅ Execução concluída:', summary);

    return new Response(JSON.stringify({
      success: true,
      ...summary,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('[ai-auto-trainer] ❌ Erro fatal:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
