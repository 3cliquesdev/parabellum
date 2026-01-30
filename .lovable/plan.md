
# Plano de Implementação: Fase 4A + 4B — Draft Automático de KB e Score de Qualidade Operacional

## Resumo Executivo

Esta fase implementa dois módulos complementares:
- **Fase 4A**: Conversão automática de KB Gaps em rascunhos de artigos (nunca publicados automaticamente)
- **Fase 4B**: Sistema de métricas de qualidade por agente e conversa (tracking passivo, sem IA avaliando pessoas)

---

## Diagnóstico do Estado Atual

| Componente | Status | Observação |
|------------|--------|------------|
| `knowledge_articles` | ✅ Existe | Falta `draft_from_gap_id`, `reviewed_by`, `reviewed_at` |
| `knowledge_articles.source` | ✅ Existe | Já suporta valores como `passive_learning`, falta `ai_draft` |
| KB Gaps Dashboard | ✅ Existe | Botão "Criar Artigo" redireciona para form, sem IA |
| Edge Function `generate-kb-draft` | ❌ Não existe | Precisa criar |
| `agent_quality_metrics` | ❌ Não existe | Precisa criar tabela |
| Dashboard de Qualidade | ❌ Não existe | Precisa criar |
| Tracking de sugestões usadas | ✅ Parcial | `used: true` existe em `ai_suggestions` |

---

## Arquitetura da Solução

### Fase 4A — Draft Automático de KB

```text
┌─────────────────────────────────────────────────────────────────────┐
│                   KB Gap Aprovado (Gestor)                           │
│                   (KBGapsDashboard.tsx)                              │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│               Botão: "Gerar Rascunho com IA"                         │
│               → generate-kb-draft (Edge Function)                    │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        KB_DRAFT_PROMPT                               │
│  - Transforma problema em artigo estruturado                        │
│  - Retorna JSON: title, when_to_use, solution, tags                │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    knowledge_articles                                │
│  - is_published = false                                             │
│  - source = 'ai_draft'                                              │
│  - draft_from_gap_id = gap.id                                       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    KnowledgeArticleDialog                            │
│  - Abre pré-preenchido com draft                                    │
│  - Banner: "Conteúdo gerado por IA — revisão obrigatória"           │
│  - Humano revisa, edita e publica                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Fase 4B — Score de Qualidade Operacional

```text
┌─────────────────────────────────────────────────────────────────────┐
│                   EVENTOS PASSIVOS (sem IA)                          │
│  1. Agente clica "Usar sugestão" → suggestions_used++               │
│  2. Conversa finalizada → resolution_time_seconds calculado         │
│  3. KB Gap criado → created_kb_gap = true                           │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    agent_quality_metrics                             │
│  - agent_id                                                          │
│  - conversation_id                                                   │
│  - suggestions_used                                                  │
│  - resolution_time_seconds                                           │
│  - created_kb_gap                                                    │
│  - copilot_active                                                    │
│  - csat_rating                                                       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Dashboard de Qualidade (Gestores)                  │
│  - Taxa de adoção do Copilot                                        │
│  - Conversas resolvidas com ajuda da IA                             │
│  - Tempo médio de resolução                                          │
│  - Top agentes por qualidade                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Alterações Detalhadas

### 1. Migração SQL: Expandir `knowledge_articles` + Criar `agent_quality_metrics`

```sql
-- ====================================================
-- FASE 4A: Expandir knowledge_articles para drafts de IA
-- ====================================================
ALTER TABLE public.knowledge_articles
  ADD COLUMN IF NOT EXISTS draft_from_gap_id UUID REFERENCES ai_suggestions(id),
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Atualizar CHECK constraint do source para incluir 'ai_draft'
-- (Se já existe constraint, precisamos recriar)
ALTER TABLE public.knowledge_articles 
  DROP CONSTRAINT IF EXISTS knowledge_articles_source_check;
ALTER TABLE public.knowledge_articles
  ADD CONSTRAINT knowledge_articles_source_check 
  CHECK (source IS NULL OR source IN ('human', 'ai_draft', 'passive_learning', 'import'));

-- Índice para buscar drafts pendentes
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_drafts 
  ON knowledge_articles(source, is_published) 
  WHERE source = 'ai_draft' AND is_published = false;

-- ====================================================
-- FASE 4B: Criar tabela de métricas de qualidade
-- ====================================================
CREATE TABLE IF NOT EXISTS public.agent_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  suggestions_used INTEGER DEFAULT 0,
  suggestions_available INTEGER DEFAULT 0,
  resolution_time_seconds INTEGER,
  created_kb_gap BOOLEAN DEFAULT false,
  copilot_active BOOLEAN DEFAULT false,
  csat_rating INTEGER,
  classification_label TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Evitar duplicatas
  UNIQUE(agent_id, conversation_id)
);

-- RLS
ALTER TABLE public.agent_quality_metrics ENABLE ROW LEVEL SECURITY;

-- Índices para performance em dashboards
CREATE INDEX IF NOT EXISTS idx_agent_quality_agent 
  ON agent_quality_metrics(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_quality_date 
  ON agent_quality_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_quality_copilot 
  ON agent_quality_metrics(copilot_active) WHERE copilot_active = true;

-- RLS Policy: Gestores podem ver tudo, agentes veem só o próprio
CREATE POLICY "Managers can view all quality metrics"
  ON agent_quality_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'general_manager', 'support_manager', 'cs_manager')
    )
    OR agent_id = auth.uid()
  );

-- Policy para INSERT (sistema interno via service role)
CREATE POLICY "System can insert quality metrics"
  ON agent_quality_metrics FOR INSERT
  TO authenticated
  WITH CHECK (agent_id = auth.uid());
```

### 2. Edge Function: `generate-kb-draft` (Nova)

**Arquivo:** `supabase/functions/generate-kb-draft/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KB_DRAFT_PROMPT = `Você é um ANALISTA DE CONHECIMENTO INTERNO.

Seu papel é transformar um PROBLEMA REAL em um ARTIGO DE BASE DE CONHECIMENTO.

REGRAS ABSOLUTAS:
- NÃO publique nada
- NÃO invente informações
- NÃO use tom comercial
- NÃO fale com cliente
- NÃO cite a conversa original
- NÃO mencione nomes de clientes ou dados pessoais

O artigo deve ser:
- Claro
- Objetivo
- Reutilizável
- Técnico e neutro

BASEIE-SE APENAS no problema informado e no contexto fornecido.
Se não houver informação suficiente, indique "[REVISAR: informação não disponível]".

Formato OBRIGATÓRIO (JSON):

{
  "title": "Título objetivo do problema",
  "when_to_use": "Quando este artigo deve ser usado pelo agente",
  "solution": "Passo a passo claro para resolver o problema",
  "tags": ["tag1", "tag2"]
}`;

interface GenerateDraftRequest {
  gapId: string;
  conversationId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { gapId, conversationId }: GenerateDraftRequest = await req.json();

    console.log(`[generate-kb-draft] Gerando draft para KB Gap: ${gapId}`);

    // 1. Buscar o KB Gap
    const { data: gap, error: gapError } = await supabaseClient
      .from('ai_suggestions')
      .select('*')
      .eq('id', gapId)
      .eq('suggestion_type', 'kb_gap')
      .single();

    if (gapError || !gap) {
      return new Response(JSON.stringify({ 
        error: 'KB Gap não encontrado' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Buscar contexto da conversa (se disponível)
    let conversationContext = '';
    const convId = conversationId || gap.conversation_id;
    
    if (convId) {
      const { data: messages } = await supabaseClient
        .from('messages')
        .select('content, sender_type')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
        .limit(20);

      if (messages && messages.length > 0) {
        conversationContext = messages.map(m => 
          `${m.sender_type === 'customer' ? 'Cliente' : 'Agente'}: ${m.content}`
        ).join('\n');
      }
    }

    // 3. Chamar IA para gerar draft
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const userPrompt = `## Problema Detectado (KB Gap):
${gap.kb_gap_description}

## Contexto da Conversa Original:
${conversationContext || 'Não disponível'}

Gere um artigo de base de conhecimento em JSON.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        max_completion_tokens: 800,
        response_format: { type: "json_object" },
        messages: [
          { role: 'system', content: KB_DRAFT_PROMPT },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || '{}';

    // 4. Parsear resposta
    let draft;
    try {
      draft = JSON.parse(rawContent);
    } catch {
      draft = {
        title: gap.kb_gap_description?.substring(0, 100) || 'Novo Artigo',
        when_to_use: '[REVISAR: geração automática falhou]',
        solution: '[REVISAR: geração automática falhou]',
        tags: []
      };
    }

    // 5. Criar artigo como draft
    const { data: { user } } = await supabaseClient.auth.getUser();

    const { data: article, error: insertError } = await supabaseClient
      .from('knowledge_articles')
      .insert({
        title: draft.title,
        content: draft.solution,
        problem: draft.title,
        solution: draft.solution,
        when_to_use: draft.when_to_use,
        when_not_to_use: null,
        category: 'Gerado por IA',
        tags: draft.tags || [],
        source: 'ai_draft',
        draft_from_gap_id: gapId,
        source_conversation_id: convId,
        is_published: false,
        embedding_generated: false,
        created_by: user?.id,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 6. Marcar KB Gap como usado
    await supabaseClient
      .from('ai_suggestions')
      .update({ used: true })
      .eq('id', gapId);

    console.log(`[generate-kb-draft] ✅ Draft criado: ${article.id}`);

    return new Response(JSON.stringify({ 
      success: true,
      article
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[generate-kb-draft] Erro:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### 3. Hook: `useGenerateKBDraft` (Novo)

**Arquivo:** `src/hooks/useGenerateKBDraft.tsx`

```typescript
export function useGenerateKBDraft() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (gapId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-kb-draft', {
        body: { gapId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kb-gaps-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
      toast({
        title: "📝 Rascunho gerado",
        description: "O artigo foi criado como rascunho. Revise antes de publicar.",
      });
      // Navegar para edição do artigo
      navigate(`/knowledge?edit=${data.article.id}&ai_draft=true`);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao gerar rascunho",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
```

### 4. Atualizar `KBGapsDashboard.tsx`

Adicionar botão "Gerar Rascunho com IA":

- Novo botão ao lado de "Criar Artigo" manual
- Ícone: `<Sparkles />` (IA)
- Chama `useGenerateKBDraft`
- Loading state enquanto gera

### 5. Atualizar `KnowledgeArticleDialog.tsx`

- Se `source === 'ai_draft'`, mostrar banner de aviso
- Banner amarelo: "⚠️ Conteúdo gerado por IA — revisão obrigatória antes de publicar"
- Campos pré-preenchidos mas editáveis

### 6. Hook: `useTrackQualityMetric` (Novo)

**Arquivo:** `src/hooks/useTrackQualityMetric.tsx`

```typescript
export function useTrackQualityMetric() {
  return useMutation({
    mutationFn: async ({
      conversationId,
      event,
      data
    }: {
      conversationId: string;
      event: 'suggestion_used' | 'conversation_closed' | 'kb_gap_created';
      data?: Record<string, any>;
    }) => {
      // Buscar ou criar registro
      const { data: existing } = await supabase
        .from('agent_quality_metrics')
        .select('*')
        .eq('conversation_id', conversationId)
        .maybeSingle();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updateData: any = {
        agent_id: user.id,
        conversation_id: conversationId,
      };

      if (event === 'suggestion_used') {
        updateData.suggestions_used = (existing?.suggestions_used || 0) + 1;
        updateData.copilot_active = true;
      } else if (event === 'conversation_closed') {
        updateData.resolution_time_seconds = data?.resolutionTime;
        updateData.csat_rating = data?.csatRating;
        updateData.classification_label = data?.classification;
      } else if (event === 'kb_gap_created') {
        updateData.created_kb_gap = true;
      }

      // Upsert
      await supabase
        .from('agent_quality_metrics')
        .upsert(updateData, { onConflict: 'agent_id,conversation_id' });
    },
    // Silencioso - não precisa feedback
  });
}
```

### 7. Página: `AgentQualityDashboard.tsx` (Nova)

**Arquivo:** `src/pages/AgentQualityDashboard.tsx`

Dashboard para gestores visualizarem métricas:

- **Cards resumo**:
  - Taxa de adoção Copilot (%)
  - Tempo médio de resolução
  - Conversas com ajuda IA
  - KB Gaps convertidos em artigos

- **Tabela de agentes**:
  - Nome do agente
  - Sugestões usadas (total)
  - Taxa de uso (usado/disponível)
  - Tempo médio resolução
  - CSAT médio

- **Gráfico de evolução mensal**

### 8. Integrar Tracking nos Componentes Existentes

- **`CopilotSuggestionCard.tsx`**: Ao clicar "Usar", chamar `trackQualityMetric('suggestion_used')`
- **`close-conversation` edge function**: Registrar `conversation_closed` com tempo de resolução
- **`generate-smart-reply`**: Ao criar KB Gap, registrar `kb_gap_created`

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| Migração SQL | Criar | Expandir `knowledge_articles`, criar `agent_quality_metrics` |
| `supabase/functions/generate-kb-draft/index.ts` | Criar | Gerar draft de artigo a partir de KB Gap |
| `src/hooks/useGenerateKBDraft.tsx` | Criar | Hook para chamar edge function |
| `src/pages/KBGapsDashboard.tsx` | Modificar | Adicionar botão "Gerar Rascunho com IA" |
| `src/components/KnowledgeArticleDialog.tsx` | Modificar | Banner de AI draft |
| `src/hooks/useTrackQualityMetric.tsx` | Criar | Tracking passivo de qualidade |
| `src/pages/AgentQualityDashboard.tsx` | Criar | Dashboard de métricas para gestores |
| `src/components/CopilotSuggestionCard.tsx` | Modificar | Tracking de uso de sugestão |
| `supabase/functions/close-conversation/index.ts` | Modificar | Registrar métricas ao fechar |
| `src/App.tsx` | Modificar | Adicionar rota `/reports/quality` |
| `supabase/config.toml` | Modificar | Declarar `generate-kb-draft` |

---

## Garantias de Segurança

### Fase 4A
- ✅ Draft sempre `is_published = false`
- ✅ Humano obrigatório para publicar
- ✅ Banner visual de aviso
- ✅ Auditoria: `reviewed_by`, `reviewed_at`, `source`

### Fase 4B
- ✅ IA não avalia pessoas (apenas tracking factual)
- ✅ Métricas são objetivas (tempo, contagem, CSAT)
- ✅ Humano interpreta os dados
- ✅ Sem ranking punitivo
- ✅ Agente vê só próprias métricas
- ✅ Gestores veem agregado para melhorias

---

## Critérios de Aceitação

### Fase 4A

| Teste | Resultado Esperado |
|-------|-------------------|
| Clicar "Gerar Rascunho" em KB Gap | ✅ Draft criado com `is_published = false` |
| IA tenta publicar diretamente | ❌ Impossível (constraint) |
| Editor abre após gerar | ✅ Campos pré-preenchidos |
| Banner de aviso | ✅ Visível em drafts de IA |
| Publicar após revisar | ✅ Funciona normalmente |

### Fase 4B

| Teste | Resultado Esperado |
|-------|-------------------|
| Agente usa sugestão | ✅ `suggestions_used++` registrado |
| Conversa fechada | ✅ `resolution_time_seconds` calculado |
| KB Gap criado | ✅ `created_kb_gap = true` |
| Dashboard de gestores | ✅ Métricas agregadas visíveis |
| Agente vê próprias métricas | ✅ RLS permite |
| Agente vê métricas de outros | ❌ RLS bloqueia |

---

## Ordem de Implementação

1. **Migração SQL**: Expandir `knowledge_articles` + criar `agent_quality_metrics`
2. **Backend**: Criar `generate-kb-draft` edge function
3. **Frontend**: Criar `useGenerateKBDraft` hook
4. **Frontend**: Atualizar `KBGapsDashboard` com botão IA
5. **Frontend**: Atualizar `KnowledgeArticleDialog` com banner
6. **Backend**: Criar tracking em `close-conversation`
7. **Frontend**: Criar `useTrackQualityMetric` hook
8. **Frontend**: Integrar tracking em `CopilotSuggestionCard`
9. **Frontend**: Criar `AgentQualityDashboard` página
10. **Deploy**: Publicar edge functions + testar
