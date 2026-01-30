
# Plano de Ajustes Finos — Fase 4 (Pré-Deploy)

## Resumo Executivo

Este plano implementa 3 ajustes finos obrigatórios para garantir integridade de métricas e rastreabilidade de drafts antes do deploy em produção.

---

## Diagnóstico do Estado Atual

| Ajuste | Status | Problema |
|--------|--------|----------|
| `needs_review` em knowledge_articles | ❌ Não existe | Drafts de IA podem ser esquecidos sem filtro |
| Idempotência em métricas | ❌ Parcial | Upsert pode sobrescrever dados válidos |
| `suggestions_available` preenchido | ❌ Vazio | Campo existe mas não é alimentado |

---

## Alterações Detalhadas

### 1. Migração SQL: Adicionar `needs_review`

Adicionar coluna para marcar artigos que precisam de revisão obrigatória:

```sql
-- Adicionar coluna needs_review para filtros de revisão
ALTER TABLE public.knowledge_articles
  ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT true;

-- Índice para buscar artigos pendentes de revisão
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_needs_review 
  ON knowledge_articles(needs_review, is_published) 
  WHERE needs_review = true AND is_published = false;
```

---

### 2. Edge Function: `generate-kb-draft` — Marcar `needs_review = true`

**Arquivo:** `supabase/functions/generate-kb-draft/index.ts`

Adicionar campo no insert (linha ~156):

**Antes:**
```typescript
const { data: article, error: insertError } = await supabaseClient
  .from('knowledge_articles')
  .insert({
    title: draft.title,
    // ...
    is_published: false,
    embedding_generated: false,
  })
```

**Depois:**
```typescript
const { data: article, error: insertError } = await supabaseClient
  .from('knowledge_articles')
  .insert({
    title: draft.title,
    // ...
    is_published: false,
    needs_review: true, // AJUSTE 1: Marcar sempre para revisão
    embedding_generated: false,
  })
```

---

### 3. Hook: `useTrackQualityMetric` — Blindar sobrescrita de métricas

**Arquivo:** `src/hooks/useTrackQualityMetric.tsx`

Atualizar lógica para só escrever campos quando ainda estiverem nulos:

**Antes (linhas 47-56):**
```typescript
} else if (event === 'conversation_closed') {
  if (data?.resolutionTime !== undefined) {
    baseData.resolution_time_seconds = data.resolutionTime;
  }
  if (data?.csatRating !== undefined) {
    baseData.csat_rating = data.csatRating;
  }
  if (data?.classification) {
    baseData.classification_label = data.classification;
  }
}
```

**Depois:**
```typescript
} else if (event === 'conversation_closed') {
  // AJUSTE 2: Só atualizar se ainda estiver nulo (idempotência)
  if (data?.resolutionTime !== undefined && !existing?.resolution_time_seconds) {
    baseData.resolution_time_seconds = data.resolutionTime;
  }
  if (data?.csatRating !== undefined && !existing?.csat_rating) {
    baseData.csat_rating = data.csatRating;
  }
  if (data?.classification && !existing?.classification_label) {
    baseData.classification_label = data.classification;
  }
}
```

---

### 4. Edge Function: `generate-smart-reply` — Preencher `suggestions_available`

**Arquivo:** `supabase/functions/generate-smart-reply/index.ts`

Após salvar as sugestões, atualizar a tabela `agent_quality_metrics` com o número de sugestões disponíveis.

**Adicionar após linha 459 (após atualizar `last_suggestion_at`):**

```typescript
// ============================================================
// AJUSTE 3: Registrar suggestions_available para métricas
// ============================================================
if (savedSuggestions.length > 0) {
  // Buscar agente atribuído à conversa
  const { data: convAgent } = await supabaseClient
    .from('conversations')
    .select('assigned_to')
    .eq('id', conversationId)
    .single();

  if (convAgent?.assigned_to) {
    // Atualizar ou criar registro de métricas com suggestions_available
    const { data: existingMetric } = await supabaseClient
      .from('agent_quality_metrics')
      .select('id, suggestions_available')
      .eq('conversation_id', conversationId)
      .eq('agent_id', convAgent.assigned_to)
      .maybeSingle();

    // Só atualiza se maior que o atual (acumulativo)
    const currentAvailable = existingMetric?.suggestions_available || 0;
    const newTotal = currentAvailable + savedSuggestions.filter(s => s.suggestion_type === 'reply').length;

    await supabaseClient
      .from('agent_quality_metrics')
      .upsert({
        agent_id: convAgent.assigned_to,
        conversation_id: conversationId,
        suggestions_available: newTotal,
        copilot_active: true,
      }, { 
        onConflict: 'agent_id,conversation_id',
        ignoreDuplicates: false 
      });

    console.log(`[generate-smart-reply] 📊 Métricas atualizadas: suggestions_available = ${newTotal}`);
  }
}
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | Adicionar `needs_review` em `knowledge_articles` |
| `supabase/functions/generate-kb-draft/index.ts` | Adicionar `needs_review: true` no insert |
| `src/hooks/useTrackQualityMetric.tsx` | Blindar sobrescrita de métricas (idempotência) |
| `supabase/functions/generate-smart-reply/index.ts` | Preencher `suggestions_available` |

---

## Critérios de Aceitação

| Teste | Resultado Esperado |
|-------|-------------------|
| Draft criado por IA | ✅ `needs_review = true` |
| Filtrar artigos pendentes | ✅ Retorna apenas `needs_review = true` |
| Evento `conversation_closed` duplicado | ✅ Não sobrescreve `resolution_time_seconds` |
| Evento `suggestion_used` múltiplo | ✅ `suggestions_used` incrementa corretamente |
| Sugestões geradas | ✅ `suggestions_available` = count de replies |
| Taxa de uso (%) | ✅ `suggestions_used / suggestions_available` funciona |

---

## Fluxo de Métricas Corrigido

```text
┌─────────────────────────────────────────────────────────────────────┐
│                   generate-smart-reply                               │
│  → Salva sugestões                                                  │
│  → Atualiza suggestions_available (só replies)                      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   CopilotSuggestionCard                              │
│  → Agente clica "Usar"                                              │
│  → useTrackQualityMetric({ event: 'suggestion_used' })              │
│  → suggestions_used++ (sempre incrementa)                           │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   close-conversation                                 │
│  → useTrackQualityMetric({ event: 'conversation_closed' })          │
│  → resolution_time_seconds (só se nulo)                             │
│  → csat_rating (só se nulo)                                         │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Dashboard de Qualidade                             │
│  → Taxa de uso = suggestions_used / suggestions_available           │
│  → Tempo médio = AVG(resolution_time_seconds)                        │
│  → CSAT médio = AVG(csat_rating)                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Garantias de Idempotência

| Campo | Comportamento |
|-------|---------------|
| `suggestions_used` | Sempre incrementa (+1) |
| `suggestions_available` | Acumula (soma novas replies) |
| `resolution_time_seconds` | Só escreve se NULL |
| `csat_rating` | Só escreve se NULL |
| `classification_label` | Só escreve se NULL |
| `copilot_active` | Pode sobrescrever (boolean) |
| `created_kb_gap` | Pode sobrescrever (boolean) |

---

## Ordem de Implementação

1. **Migração SQL**: Adicionar `needs_review`
2. **Edge Function**: Atualizar `generate-kb-draft` com `needs_review: true`
3. **Frontend**: Atualizar `useTrackQualityMetric` com idempotência
4. **Edge Function**: Atualizar `generate-smart-reply` com `suggestions_available`
5. **Deploy**: Publicar edge functions
6. **Teste**: Validar fluxo completo de métricas

---

## Checklist Final GO/NO-GO

| Item | Status |
|------|--------|
| `needs_review` adicionado | 🔜 Implementar |
| Idempotência de métricas | 🔜 Implementar |
| `suggestions_available` preenchido | 🔜 Implementar |
| Deploy edge functions | 🔜 Após ajustes |

**Após implementação: 100% produção-safe ✅**
