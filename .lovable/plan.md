

# Plano: Tornar transition type dinâmico nos transfer nodes do process-chat-flow

## Problema
Os transfer nodes no `process-chat-flow` sempre enviam `transition: 'handoff_to_human'`, mas o nó pode ter `nextNode.data?.ai_mode` como `'copilot'` ou `'autopilot'`, resultando em `ai_mode` incorreto.

## Alterações

### Arquivo: `supabase/functions/process-chat-flow/index.ts`

**Bloco 1 — Transfer node padrão (linha 2831-2849):**
Antes do `fetch`, calcular o `transitionType` dinâmico:
```typescript
const transferAiMode = nextNode.data?.ai_mode || 'waiting_human';
const transitionType =
  transferAiMode === 'copilot'   ? 'set_copilot' :
  transferAiMode === 'autopilot' ? 'engage_ai' :
  'handoff_to_human';
```
E usar `transition: transitionType` no body do fetch.

**Bloco 2 — Transfer node msg chain (linha 3094-3112):**
Mesmo padrão — calcular `transitionType` a partir de `nextNode.data?.ai_mode` e usar no body.

### Blocos que NÃO mudam (corretos como estão)
- **Linha 727** — contract violation: sempre `handoff_to_human` ✅
- **Linha 2327** — handoff sem próximo nó: sempre `handoff_to_human` ✅
- **Linha 2377** — aiExitForced sem nó: sempre `handoff_to_human` ✅

São situações de emergência/fallback onde o humano é sempre o destino correto.

## Impacto
Apenas 2 blocos editados, ~3 linhas adicionadas em cada. Sem risco para os demais chamadores.

