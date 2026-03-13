

# Diagnóstico: IA retorna conteúdo vazio para mensagens financeiras

## Problema Raiz

Na linha 6984, quando a OpenAI retorna `content: null` sem tool_calls, o sistema usa o fallback genérico "Pode repetir sua mensagem?". E na linha 6988-6993, como `confidenceResult.action === 'cautious'`, adiciona o prefixo "Baseado nas informações disponíveis:" — gerando a mensagem inútil vista no screenshot.

Isso acontece 2x seguidas, e depois o auto-close por inatividade encerra a conversa sem que o cliente tenha sido atendido.

## Causa Provável

O modelo LLM retorna `content: null` (sem tool_calls) — pode ser por truncamento, timeout, ou payload muito longo. O sistema não tem nenhum mecanismo de retry ou fallback inteligente para esse cenário.

## 3 Correções

### FIX A — Não adicionar prefixo cautious ao fallback vazio (cosmético)
**Linha ~6984-6993**

Se `rawAIContent` é null, o prefixo "Baseado nas informações disponíveis:" não deveria ser adicionado — ele implica que a IA processou algo, quando na verdade não processou nada.

```typescript
let assistantMessage = rawAIContent || 'Pode repetir sua mensagem? Não consegui processar corretamente.';
const isEmptyAIResponse = !rawAIContent;

// Prefixo cautious SÓ se a IA realmente gerou conteúdo
if (confidenceResult.action === 'cautious' && !toolCalls.length && !isEmptyAIResponse) {
  // ... adicionar prefixo
}
```

### FIX B — Retry automático quando IA retorna vazio (resiliência)
**Linha ~6978-6984**

Quando `rawAIContent` é null e não há tool_calls, tentar uma segunda chamada com payload simplificado (menos tokens no prompt, modelo fallback):

```typescript
const aiData = await callAIWithFallback(aiPayload);
let rawAIContent = aiData.choices?.[0]?.message?.content;
const toolCalls = aiData.choices?.[0]?.message?.tool_calls || [];

// 🆕 RETRY: Se IA retornou vazio sem tool_calls, tentar com prompt reduzido
if (!rawAIContent && !toolCalls.length) {
  console.warn('[ai-autopilot-chat] ⚠️ IA retornou vazio — tentando retry com prompt reduzido');
  try {
    const retryPayload = {
      messages: [
        { role: 'system', content: contextualizedSystemPrompt.substring(0, 4000) },
        ...messageHistory.slice(-5),
        { role: 'user', content: customerMessage }
      ],
      temperature: 0.7,
      max_tokens: 300
    };
    const retryData = await callAIWithFallback(retryPayload);
    rawAIContent = retryData.choices?.[0]?.message?.content;
    if (rawAIContent) {
      console.log('[ai-autopilot-chat] ✅ Retry bem-sucedido');
    }
  } catch (retryErr) {
    console.error('[ai-autopilot-chat] ❌ Retry também falhou:', retryErr);
  }
}

let assistantMessage = rawAIContent || 'Pode repetir sua mensagem? Não consegui processar corretamente.';
```

### FIX C — Detecção de intent financeiro no fallback vazio + flow_context (roteamento)
**Após a linha do retry**

Se mesmo após retry o conteúdo é vazio, E a mensagem do cliente contém termos financeiros, E existe `forbidFinancial` no flow_context → disparar `[[FLOW_EXIT:financeiro]]` automaticamente em vez de enviar fallback inútil:

```typescript
if (!rawAIContent && !toolCalls.length && flow_context) {
  const financialTerms = /\b(saque|sacar|reembolso|estorno|devolução|dinheiro|pix|saldo)\b/i;
  if (financialTerms.test(customerMessage) && flowForbidFinancial) {
    console.log('[ai-autopilot-chat] 🎯 Fallback vazio + intent financeiro → FLOW_EXIT:financeiro');
    return new Response(JSON.stringify({
      flowExit: true,
      reason: 'ai_empty_response_financial_intent',
      ai_exit_intent: 'financeiro',
      hasFlowContext: true,
      flow_context: { flow_id: flow_context.flow_id, node_id: flow_context.node_id }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
```

## Resumo de Impacto

| Fix | O que resolve | Risco |
|-----|--------------|-------|
| A | Remove prefixo enganoso "Baseado nas informações disponíveis:" do fallback | Zero — cosmético |
| B | Tenta recuperar resposta antes de desistir | Baixo — retry é fire-and-forget |
| C | Redireciona para fluxo financeiro quando IA falha em contexto financeiro | Baixo — só ativa quando tudo falhou E intent é claro |

## Arquivos Afetados
- `supabase/functions/ai-autopilot-chat/index.ts` (único arquivo)

