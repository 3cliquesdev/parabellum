

# Plano: Patch exato no bloco `ai_response` do `process-chat-flow`

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Diagnóstico

O bloco `ai_response` em `supabase/functions/process-chat-flow/index.ts` (linhas 1059–1149) tem dois problemas:

1. **Sem anti-duplicação** — mensagens duplicadas (mesmo texto em <5s) incrementam o contador, causando EXIT prematuro
2. **EXIT por `max_interactions` avança no fluxo** — deveria transferir para humano (`waiting_human`) e encerrar o flow state

## Solução — Patch exato (linhas 1059–1149)

Substituir o bloco inteiro `else if (currentNode.type === 'ai_response') { ... }` pelo código do usuário, com uma adaptação:

**O helper `sendMetaWhatsAppMessage` não existe** neste escopo. Para enviar a fallback message via WhatsApp, o código precisa:
1. Buscar dados da conversa (`channel`, `contact_id`, `whatsapp_meta_instance_id`)
2. Buscar o phone do contato (`phone`, `whatsapp_id`)
3. Salvar na tabela `messages`
4. Invocar `send-meta-whatsapp` (mesmo padrão usado no bloco `manualTrigger` nas linhas 713–796)

### Código final do bloco (resumo das mudanças)

```typescript
} else if (currentNode.type === 'ai_response') {
  // UPGRADE 1: Anti-duplicação (texto + janela 5s)
  collectedData.__ai = collectedData.__ai || { interaction_count: 0 };
  const now = Date.now();
  const msgLower = (userMessage || '').toLowerCase().trim();
  const lastMsg = String(collectedData.__ai.last_message || '').toLowerCase().trim();
  const lastTs = Number(collectedData.__ai.last_timestamp || 0);
  const isDuplicate = msgLower.length > 0 && msgLower === lastMsg && (now - lastTs) < 5000;

  if (!isDuplicate) {
    collectedData.__ai.interaction_count++;
    collectedData.__ai.last_message = userMessage || '';
    collectedData.__ai.last_timestamp = now;
  } else {
    console.log('[process-chat-flow] ⚠️ Duplicate detected, skip counter');
  }

  const aiCount = Number(collectedData.__ai.interaction_count || 0);
  // ... exit keywords + max check (igual) ...

  if (keywordMatch || maxReached) {
    // ... ai_events log (igual) ...

    // UPGRADE 2: max_interactions → humano (não avança)
    if (maxReached && !keywordMatch) {
      const fallbackMsg = currentNode.data?.fallback_message
        || 'Vou te transferir para um atendente humano...';

      // Buscar conversa para delivery (mesmo padrão do manualTrigger)
      const { data: convExit } = await supabaseClient
        .from('conversations')
        .select('channel, contact_id, whatsapp_meta_instance_id')
        .eq('id', conversationId).maybeSingle();

      // Salvar mensagem + enviar via WhatsApp se aplicável
      await supabaseClient.from('messages').insert({
        conversation_id: conversationId,
        content: fallbackMsg,
        sender_type: 'system',
        is_ai_generated: true,
        channel: convExit?.channel || 'web_chat',
        status: 'sent'
      });

      if (convExit?.channel === 'whatsapp' && convExit?.contact_id) {
        const { data: contactExit } = await supabaseClient
          .from('contacts').select('phone, whatsapp_id')
          .eq('id', convExit.contact_id).maybeSingle();
        const exitPhone = contactExit?.whatsapp_id || contactExit?.phone;
        if (exitPhone && convExit.whatsapp_meta_instance_id) {
          await supabaseClient.functions.invoke('send-meta-whatsapp', {
            body: {
              instance_id: convExit.whatsapp_meta_instance_id,
              phone_number: exitPhone,
              message: fallbackMsg,
              conversation_id: conversationId,
              skip_db_save: true,
              is_bot_message: true
            }
          });
        }
      }

      // Marcar waiting_human + completar flow
      await supabaseClient.from('conversations')
        .update({ ai_mode: 'waiting_human' }).eq('id', conversationId);
      await supabaseClient.from('chat_flow_states')
        .update({ status: 'completed', collected_data: collectedData })
        .eq('id', activeState.id);

      return new Response(JSON.stringify({
        success: true, useAI: false, completed: true,
        exitReason: 'max_interactions_human_transfer',
        fallbackMessage: fallbackMsg
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // EXIT por keyword: avança no fluxo (comportamento atual)
    delete collectedData.__ai;
  } else {
    // STAY: igual ao atual
    // ... (sem mudanças) ...
  }
}
```

## Arquivo e linhas

| Arquivo | Linhas | Mudança |
|---|---|---|
| `supabase/functions/process-chat-flow/index.ts` | 1059–1149 | Substituir bloco `ai_response` inteiro |

## Deploy

Automático após salvar o arquivo (edge function `process-chat-flow`).

## Impacto

| Regra | Status |
|---|---|
| Regressão zero | Sim — `exit_keyword` continua avançando igual |
| Upgrade | Sim — dedup + max_interactions transfere para humano |
| Fluxo nunca mudo | Sim — fallback_message é enviado antes da transferência |
| Kill Switch | Não afetado |
| Delivery WhatsApp | Usa mesmo padrão do `manualTrigger` (linhas 713-796) |

