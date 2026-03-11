

# Fix: IA nunca deve abandonar o nó de entrada

4 mudanças cirúrgicas em `supabase/functions/ai-autopilot-chat/index.ts`:

## Fix 1 — Remover Zero Confidence Guard (linhas 4877-4909)

Substituir o bloco inteiro que retorna `flow_advance_needed` com `reason: zero_confidence_zero_articles` por código que força `confidenceResult.action = 'cautious'` e continua a execução normalmente. A IA será chamada mesmo sem artigos da KB, usando persona + contexto + conhecimento geral.

## Fix 2 — Bloquear Strict RAG de forçar saída (linhas 4328-4351)

No bloco onde `strictResult.shouldHandoff && flow_context`, em vez de retornar `flow_advance_needed`, logar que o strict RAG foi ignorado no contexto de fluxo e deixar a execução continuar (remover o `return`). A IA responde com conhecimento geral.

## Fix 3 — Impedir fallback phrases de causar saída (linhas 8037-8061)

No bloco `if (isFallbackResponse) { if (flow_context) { ... return flow_advance_needed } }`, em vez de retornar `flow_advance_needed`:
- Limpar as fallback phrases da `assistantMessage` (regex strip)
- Persistir a versão limpa no banco
- Continuar execução normal (resposta já salva, sem exit)

## Fix 4 — Aumentar tolerância do fallback count (linha 8006)

Mudar `aiNodeFallbackCount >= 2` para `aiNodeFallbackCount >= 5`.

## Resultado

A IA **sempre** tenta responder no nó de entrada. Saída só por: exit keyword explícita, max interactions, triggers financeiros/comerciais configurados, ou `forceAIExit`.

