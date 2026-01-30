import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Prompt ético que NÃO avalia pessoas
const INSIGHTS_PROMPT = `Você é um ANALISTA DE OPERAÇÕES focado em padrões de sistema.

Seu papel é identificar PADRÕES em dados agregados de um sistema de atendimento com IA (Copilot).

REGRAS ABSOLUTAS:
- NUNCA mencione agentes específicos, nomes ou IDs
- NUNCA faça rankings ou comparações entre pessoas
- NUNCA use tom punitivo ou de cobrança
- Foque APENAS em padrões do SISTEMA, não de pessoas
- Seja direto e acionável

Analise os dados e retorne 3-5 insights acionáveis no formato JSON:

{
  "insights": [
    {
      "type": "positive" | "warning" | "opportunity",
      "title": "Título curto do insight (max 50 chars)",
      "description": "Descrição do padrão encontrado (max 120 chars)",
      "action": "Sugestão de ação para melhoria (max 100 chars)"
    }
  ]
}

Exemplos de bons insights:
- "Conversas com uso de 2+ sugestões resolvem 31% mais rápido"
- "Fila de Suporte tem alta criação de KB Gaps → falta cobertura"
- "Categoria de Dúvidas de Pagamento tem CSAT menor sem Copilot"
- "Taxa de adoção cresceu 15% no último mês"
- "Sugestões estão sendo geradas mas pouco usadas → revisar qualidade"

Exemplos de insights PROIBIDOS:
- "O agente João tem baixa adoção" ❌
- "Maria é a melhor em usar sugestões" ❌
- "Cobrar equipe para usar mais IA" ❌
- "Agentes precisam ser mais produtivos" ❌`;

interface InsightRequest {
  healthScore: any;
  comparison: any[];
  evolution: any[];
  kbGaps: any[];
}

interface Insight {
  type: "positive" | "warning" | "opportunity";
  title: string;
  description: string;
  action: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: InsightRequest = await req.json();
    const { healthScore, comparison, evolution, kbGaps } = body;

    console.log("[generate-copilot-insights] 📊 Gerando insights para dados agregados");

    // Build context for AI
    const dataContext = `
## Dados do Health Score da Operação (últimos 30 dias)
- Total de conversas: ${healthScore?.total_conversations || 0}
- Conversas com Copilot ativo: ${healthScore?.copilot_active_count || 0}
- Taxa de adoção: ${healthScore?.copilot_adoption_rate || 0}%
- Tempo médio com Copilot: ${healthScore?.avg_resolution_time_with_copilot || 0}s
- Tempo médio sem Copilot: ${healthScore?.avg_resolution_time_without_copilot || 0}s
- Melhoria de eficiência: ${healthScore?.resolution_improvement_percent || 0}%
- CSAT médio com Copilot: ${healthScore?.avg_csat_with_copilot || 0}
- CSAT médio sem Copilot: ${healthScore?.avg_csat_without_copilot || 0}
- Cobertura KB: ${healthScore?.kb_coverage_rate || 0}%
- KB Gaps criados: ${healthScore?.kb_gap_count || 0}
- Sugestões usadas: ${healthScore?.suggestions_used_total || 0}
- Sugestões disponíveis: ${healthScore?.suggestions_available_total || 0}
- Taxa de aproveitamento: ${healthScore?.suggestion_usage_rate || 0}%
- Health Score geral: ${healthScore?.health_score || 0}/100

## Comparativo Com IA vs Sem IA
${JSON.stringify(comparison || [], null, 2)}

## Evolução Mensal (últimos meses)
${JSON.stringify(evolution || [], null, 2)}

## KB Gaps por Categoria
${JSON.stringify(kbGaps || [], null, 2)}
`;

    // Call AI to generate insights
    const aiGatewayUrl = Deno.env.get("AI_GATEWAY_URL") || "https://ai.lovable.dev/v1/chat/completions";

    const aiResponse = await fetch(aiGatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY") || ""}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: INSIGHTS_PROMPT },
          { role: "user", content: dataContext },
        ],
        max_tokens: 1000,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      console.error("[generate-copilot-insights] ❌ Erro na chamada AI:", await aiResponse.text());
      
      // Fallback: generate basic insights without AI
      const fallbackInsights = generateFallbackInsights(healthScore, comparison, kbGaps);
      
      return new Response(
        JSON.stringify({ 
          insights: fallbackInsights,
          source: "fallback"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    let insights: Insight[] = [];

    try {
      const parsed = JSON.parse(content || "{}");
      insights = parsed.insights || [];
    } catch (parseError) {
      console.error("[generate-copilot-insights] ⚠️ Erro ao parsear JSON, usando fallback");
      insights = generateFallbackInsights(healthScore, comparison, kbGaps);
    }

    // Validate and sanitize insights
    insights = insights.slice(0, 5).map((insight) => ({
      type: ["positive", "warning", "opportunity"].includes(insight.type) ? insight.type : "opportunity",
      title: String(insight.title || "").slice(0, 60),
      description: String(insight.description || "").slice(0, 150),
      action: String(insight.action || "").slice(0, 120),
    }));

    console.log(`[generate-copilot-insights] ✅ ${insights.length} insights gerados`);

    return new Response(
      JSON.stringify({ 
        insights,
        source: "ai",
        generatedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[generate-copilot-insights] ❌ Erro:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Fallback insights when AI is unavailable
function generateFallbackInsights(healthScore: any, comparison: any[], kbGaps: any[]): Insight[] {
  const insights: Insight[] = [];

  // Insight 1: Adoption rate
  const adoptionRate = healthScore?.copilot_adoption_rate || 0;
  if (adoptionRate >= 70) {
    insights.push({
      type: "positive",
      title: "Alta adoção do Copilot",
      description: `${adoptionRate}% das conversas utilizam o assistente IA`,
      action: "Continue promovendo as melhores práticas da equipe",
    });
  } else if (adoptionRate >= 40) {
    insights.push({
      type: "opportunity",
      title: "Adoção do Copilot pode melhorar",
      description: `${adoptionRate}% de adoção — há espaço para crescimento`,
      action: "Identifique barreiras e promova treinamentos",
    });
  } else {
    insights.push({
      type: "warning",
      title: "Baixa adoção do Copilot",
      description: `Apenas ${adoptionRate}% das conversas usam IA`,
      action: "Investigue motivos e promova benefícios do assistente",
    });
  }

  // Insight 2: Resolution time
  const resWithCopilot = healthScore?.avg_resolution_time_with_copilot || 0;
  const resWithoutCopilot = healthScore?.avg_resolution_time_without_copilot || 0;
  if (resWithCopilot > 0 && resWithoutCopilot > resWithCopilot) {
    const improvement = Math.round(((resWithoutCopilot - resWithCopilot) / resWithoutCopilot) * 100);
    insights.push({
      type: "positive",
      title: "Copilot acelera resoluções",
      description: `Conversas com IA resolvem ${improvement}% mais rápido`,
      action: "Considere expandir uso para outras filas",
    });
  }

  // Insight 3: KB Gaps
  const gapCount = healthScore?.kb_gap_count || 0;
  if (gapCount > 10) {
    const topGap = kbGaps?.[0];
    insights.push({
      type: "warning",
      title: "Alta criação de KB Gaps",
      description: `${gapCount} gaps identificados${topGap ? ` — categoria "${topGap.category}" lidera` : ""}`,
      action: "Priorize criação de artigos para categorias com mais gaps",
    });
  } else if (gapCount > 0) {
    insights.push({
      type: "opportunity",
      title: "Oportunidade de expandir KB",
      description: `${gapCount} gaps podem virar novos artigos`,
      action: "Revise sugestões de artigos no painel de KB",
    });
  }

  // Insight 4: Suggestion usage
  const usageRate = healthScore?.suggestion_usage_rate || 0;
  if (usageRate < 30 && healthScore?.suggestions_available_total > 0) {
    insights.push({
      type: "opportunity",
      title: "Sugestões pouco utilizadas",
      description: `Apenas ${usageRate}% das sugestões são aproveitadas`,
      action: "Avalie qualidade das sugestões e relevância do contexto",
    });
  }

  return insights.slice(0, 5);
}
