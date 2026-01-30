
# Plano de Implementação: Ajustes Finos — Fase 3 Final

## Resumo Executivo

Esta fase aplica **ajustes de segurança e otimização** ao sistema Copilot da Fase 3 para garantir eficiência de custo, precisão de scores e proteção contra ruído analítico.

---

## Diagnóstico do Estado Atual

| Ajuste | Status | Problema |
|--------|--------|----------|
| Anti-spam de sugestões | ❌ Não existe | Cada mensagem dispara IA |
| Normalização confidence_score | ❌ Não existe | IA pode inflar scores |
| Limitar 1 classification/conversa | ❌ Não existe | Ruído em analytics |
| Falha silenciosa | ✅ Parcial | JSON inválido tratado, mas erro visível em toast |
| Persistência histórico | ✅ Implementado | IA só lê messages, não escreve |

---

## Alterações Detalhadas

### 1. Migração SQL: Adicionar `last_suggestion_at` e `last_classified_at`

Novas colunas na tabela `conversations` para controle anti-spam:

```sql
-- Controle anti-spam de sugestões Copilot
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_suggestion_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_classified_at TIMESTAMPTZ;

-- Índice para consultas de cooldown
CREATE INDEX IF NOT EXISTS idx_conversations_last_suggestion 
  ON conversations(last_suggestion_at);
```

### 2. Edge Function: `generate-smart-reply` — Anti-spam (60s)

**Arquivo:** `supabase/functions/generate-smart-reply/index.ts`

Adicionar verificação de cooldown antes de processar:

```typescript
// ANTI-SPAM: Verificar se já gerou sugestão nos últimos 60s
const { data: convCheck } = await supabaseClient
  .from('conversations')
  .select('last_suggestion_at')
  .eq('id', conversationId)
  .single();

const lastSuggestionAt = convCheck?.last_suggestion_at 
  ? new Date(convCheck.last_suggestion_at) 
  : null;
const now = new Date();

if (lastSuggestionAt && (now.getTime() - lastSuggestionAt.getTime()) < 60000) {
  console.log('[generate-smart-reply] ⏳ Cooldown ativo, ignorando...');
  return new Response(JSON.stringify({ 
    status: 'skipped', 
    reason: 'cooldown_60s',
    seconds_remaining: Math.ceil((60000 - (now.getTime() - lastSuggestionAt.getTime())) / 1000)
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Atualizar timestamp após processamento bem-sucedido
await supabaseClient
  .from('conversations')
  .update({ last_suggestion_at: new Date().toISOString() })
  .eq('id', conversationId);
```

### 3. Edge Function: Normalização de `confidence_score`

**Arquivo:** `supabase/functions/generate-smart-reply/index.ts`

Adicionar cálculo de `system_confidence_score` e usar `Math.min()`:

```typescript
// NORMALIZAÇÃO: Calcular system_confidence_score
function calculateSystemConfidence(suggestion: ObserverSuggestion, kbContext: string): number {
  let systemScore = 50; // Base
  
  if (suggestion.type === 'reply') {
    // +30 se KB foi encontrada
    if (kbContext !== 'Nenhum artigo relevante encontrado.') {
      systemScore += 30;
    }
    // +20 se resposta é curta e objetiva (< 200 chars)
    if (suggestion.content.length < 200) {
      systemScore += 10;
    }
    // +10 se não contém perguntas
    if (!suggestion.content.includes('?')) {
      systemScore += 10;
    }
  } else if (suggestion.type === 'kb_gap') {
    // KB Gap sempre score baixo (precisa de revisão humana)
    systemScore = 60;
  } else if (suggestion.type === 'classification') {
    // Classification sempre confiança média
    systemScore = 70;
  }
  
  return Math.min(100, systemScore);
}

// Uso na inserção:
const aiConfidence = Math.min(100, Math.max(0, suggestion.confidence_score || 0));
const systemConfidence = calculateSystemConfidence(suggestion, kbContext);
const finalConfidence = Math.min(aiConfidence, systemConfidence);

insertData.confidence_score = finalConfidence;
```

### 4. Edge Function: Limitar 1 Classification por Conversa

**Arquivo:** `supabase/functions/generate-smart-reply/index.ts`

Verificar se já existe classification antes de inserir:

```typescript
// ANTI-DUPLICIDADE: Verificar se já existe classification
if (suggestion.type === 'classification') {
  const { data: existingClassification } = await supabaseClient
    .from('ai_suggestions')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('suggestion_type', 'classification')
    .limit(1)
    .maybeSingle();
  
  if (existingClassification) {
    console.log('[generate-smart-reply] ⏭️ Classification já existe, pulando...');
    continue; // Pular inserção
  }
  
  // Atualizar timestamp de classificação
  await supabaseClient
    .from('conversations')
    .update({ last_classified_at: new Date().toISOString() })
    .eq('id', conversationId);
}
```

### 5. Edge Function: Falha Silenciosa Completa

**Arquivo:** `supabase/functions/generate-smart-reply/index.ts`

Garantir que erros retornam lista vazia sem log visível ao agente:

```typescript
} catch (error) {
  // FALHA SILENCIOSA: Log interno apenas, retorno vazio para agente
  console.error('[generate-smart-reply] ❌ Erro silenciado:', error);
  
  return new Response(JSON.stringify({ 
    status: 'silent_fallback',
    suggestions_count: 0,
    suggestions: []
  }), {
    // Sempre 200 para não disparar erro no frontend
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

### 6. Frontend: Remover Toast de Erro

**Arquivo:** `src/hooks/useCopilotSuggestions.tsx`

Silenciar erros para não incomodar agente:

```typescript
onError: (error: Error) => {
  // SILENCIOSO: Não exibir toast de erro para sugestões
  // Agente não precisa saber que sugestão falhou
  console.warn('[useGenerateCopilotSuggestions] Erro silenciado:', error.message);
  // Remover: toast({ variant: "destructive", ... });
},
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | Adicionar `last_suggestion_at` e `last_classified_at` |
| `supabase/functions/generate-smart-reply/index.ts` | Anti-spam 60s, normalização score, 1 classification |
| `src/hooks/useCopilotSuggestions.tsx` | Silenciar toast de erro |

---

## Fluxo Anti-spam

```text
┌─────────────────────────────────────────────────────┐
│               Mensagem do Cliente                    │
└───────────────────────────┬─────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │ Verificar last_suggestion_at │
              │ (< 60 segundos?)             │
              └─────────────┬───────────────┘
                            │
             ┌──────────────┴──────────────┐
             │                             │
        ❌ < 60s                      ✅ >= 60s
             │                             │
             ▼                             ▼
   ┌──────────────────┐       ┌──────────────────────┐
   │ Retornar SKIPPED │       │ Gerar Sugestões      │
   │ (cooldown ativo) │       │ + Atualizar timestamp│
   └──────────────────┘       └──────────────────────┘
```

---

## Fórmula de Confidence

```text
final_confidence = MIN(ai_confidence, system_confidence)

System Confidence:
├── Base: 50
├── +30: KB match encontrado
├── +10: Resposta curta (<200 chars)
├── +10: Sem perguntas (?)
└── Max: 100

Exemplos:
- Reply com KB match, curta, sem pergunta: MIN(AI, 100) 
- Reply inferida, longa, com pergunta: MIN(AI, 50)
- KB Gap: sempre 60 (precisa revisão)
- Classification: sempre 70
```

---

## Critérios de Aceitação

| Teste | Resultado Esperado |
|-------|-------------------|
| 2 mensagens em 30s | ✅ Segunda é skipped (cooldown) |
| IA retorna score 95, sem KB | ✅ Final = min(95, 50) = 50 |
| 2 classifications mesma conversa | ✅ Segunda não é criada |
| Erro de rede/timeout | ✅ Retorna lista vazia, sem toast |
| JSON inválido da IA | ✅ Fallback silencioso |

---

## Garantias de Segurança

- ✅ Anti-spam: 60s entre sugestões
- ✅ Score normalizado: IA não pode inflar
- ✅ 1 classification/conversa: Analytics limpo
- ✅ Falha silenciosa: Agente não vê erros
- ✅ Histórico preservado: IA só lê, nunca escreve

---

## Ordem de Implementação

1. **Migração SQL**: Adicionar colunas de controle
2. **Backend**: Atualizar `generate-smart-reply` com anti-spam + normalização
3. **Frontend**: Silenciar toast de erro
4. **Deploy**: Publicar edge functions
5. **Teste**: Validar cooldown e scores

