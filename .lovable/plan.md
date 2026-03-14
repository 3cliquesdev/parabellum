

## Plano: Aplicar Guards de Resposta Vazia no Autopilot

O arquivo atual (`ai-autopilot-chat/index.ts`) **não tem** as duas proteções contra resposta vazia. O arquivo enviado já contém ambas.

### Alterações

**1. Guard 1 — Dentro do `callStrictRAG`** (após linha 4241 atual)

Após `const aiMessage = data.choices?.[0]?.message?.content || '';`, adicionar verificação que força handoff se a resposta do GPT-5 for vazia:

```typescript
if (!aiMessage || aiMessage.trim().length === 0) {
  console.warn('[callStrictRAG] ⚠️ GPT-5 retornou resposta vazia - forçando handoff');
  return { shouldHandoff: true, reason: 'GPT-5 retornou resposta vazia', response: null };
}
```

**2. Guard 2 — Antes de salvar/enviar a resposta strict** (após `const strictResponse = strictResult.response!;`)

Adicionar fallback que impede envio de mensagem vazia ao WhatsApp:

```typescript
if (!strictResponse || strictResponse.trim().length === 0) {
  const fallbackGreeting = `Olá${contactName ? ', ' + contactName : ''}! Como posso te ajudar hoje? 😊`;
  return new Response(JSON.stringify({
    response: fallbackGreeting,
    source: 'strict_rag_empty_fallback',
    handoff: false
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
```

### Resultado

Duas camadas de proteção: a primeira evita que resposta vazia seja marcada como "validada"; a segunda garante que, se algo escapar, nunca chegue ao WhatsApp sem conteúdo.

