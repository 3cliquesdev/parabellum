

# IA Autopilot — Encerramento Autônomo de Conversas

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Arquivo modificado

`supabase/functions/ai-autopilot-chat/index.ts`

## Mudanças (4 pontos de inserção)

### 1. Nova tool `close_conversation` no array `coreTools` (~linha 5689)

Adicionar após `request_human_agent`:

```typescript
{
  type: 'function',
  function: {
    name: 'close_conversation',
    description: 'Encerra a conversa. Use em 2 etapas: (1) Pergunte ao cliente se pode encerrar (customer_confirmed=false), (2) Após cliente confirmar "sim", execute com customer_confirmed=true. NUNCA encerre sem confirmação explícita.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Motivo do encerramento (ex: "assunto_resolvido", "cliente_agradeceu")' },
        customer_confirmed: { type: 'boolean', description: 'true SOMENTE após cliente confirmar explicitamente que pode encerrar' }
      },
      required: ['reason', 'customer_confirmed']
    }
  }
}
```

### 2. Detector de confirmação `awaiting_close_confirmation` (~linha 1600, antes do bloco `awaiting_email_for_handoff`)

Inserir ANTES do bloco de email para handoff:

```typescript
// ============================================================
// 🔒 PRIORIDADE: ESTADO awaiting_close_confirmation
// Se IA pediu confirmação de encerramento, processar resposta
// ============================================================
{
  const closeMeta = conversation.customer_metadata || {};
  if (closeMeta.awaiting_close_confirmation === true) {
    const msgLower = (customerMessage || '').toLowerCase().trim();
    
    // Padrões de SIM
    const yesPatterns = /^(sim|s|yes|pode|pode sim|ok|claro|com certeza|isso|beleza|blz|valeu|vlw|pode fechar|encerra|encerrar|fechou|fechou!|tá bom|ta bom|tá|ta)$/i;
    // Padrões de NÃO
    const noPatterns = /^(n[aã]o|nao|n|não|nope|ainda n[aã]o|tenho|tenho sim|outra|mais uma|espera|perai|pera)$/i;
    
    if (yesPatterns.test(msgLower)) {
      console.log('[ai-autopilot-chat] ✅ Cliente CONFIRMOU encerramento');
      
      // Checar governança
      const { data: aiConfigs } = await supabaseClient
        .from('system_configurations')
        .select('key, value')
        .in('key', ['ai_global_enabled', 'ai_shadow_mode', 'conversation_tags_required']);
      
      const configMap = new Map((aiConfigs || []).map((c: any) => [c.key, c.value]));
      const killSwitch = configMap.get('ai_global_enabled') === 'false';
      const shadowMode = configMap.get('ai_shadow_mode') === 'true';
      const tagsRequired = configMap.get('conversation_tags_required') === 'true';
      
      // Limpar flag
      const cleanMeta = { ...closeMeta };
      delete cleanMeta.awaiting_close_confirmation;
      delete cleanMeta.close_reason;
      
      if (killSwitch) {
        await supabaseClient.from('conversations')
          .update({ ai_mode: 'waiting_human', customer_metadata: cleanMeta })
          .eq('id', conversationId);
        // Enviar mensagem e retornar
        const killMsg = 'No momento, o encerramento automático está indisponível. Um atendente humano vai finalizar seu atendimento. Aguarde um momento!';
        await supabaseClient.from('messages').insert({
          conversation_id: conversationId, content: killMsg,
          sender_type: 'user', is_ai_generated: true, is_bot_message: true
        });
        if (responseChannel === 'whatsapp' || responseChannel === 'whatsapp_meta') {
          await supabaseClient.functions.invoke('send-meta-whatsapp', {
            body: { conversationId, message: killMsg }
          });
        }
        return new Response(JSON.stringify({ status: 'disabled', reason: 'kill_switch' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      if (shadowMode) {
        await supabaseClient.from('conversations')
          .update({ customer_metadata: cleanMeta })
          .eq('id', conversationId);
        const shadowMsg = 'Obrigado pelo contato! Se precisar de mais alguma coisa, estou por aqui. 😊\n\n_(Sugestão interna: conversa pode ser encerrada pelo agente)_';
        // Em shadow mode, NÃO envia para cliente - apenas salva internamente
        await supabaseClient.from('messages').insert({
          conversation_id: conversationId, content: shadowMsg,
          sender_type: 'user', is_ai_generated: true, is_bot_message: true
        });
        // NÃO enviar via WhatsApp em shadow mode
        return new Response(JSON.stringify({ status: 'suggested_only', reason: 'shadow_mode' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      // Checar tags obrigatórias
      if (tagsRequired) {
        const { data: convTags } = await supabaseClient
          .from('conversation_tags')
          .select('tag_id')
          .eq('conversation_id', conversationId);
        
        if (!convTags || convTags.length === 0) {
          await supabaseClient.from('conversations')
            .update({ ai_mode: 'waiting_human', customer_metadata: cleanMeta })
            .eq('id', conversationId);
          const tagMsg = 'Obrigado pelo contato! Um atendente vai finalizar seu atendimento em instantes. 😊';
          await supabaseClient.from('messages').insert({
            conversation_id: conversationId, content: tagMsg,
            sender_type: 'user', is_ai_generated: true, is_bot_message: true
          });
          if (responseChannel === 'whatsapp' || responseChannel === 'whatsapp_meta') {
            await supabaseClient.functions.invoke('send-meta-whatsapp', {
              body: { conversationId, message: tagMsg }
            });
          }
          // Nota interna para agente
          await supabaseClient.from('interactions').insert({
            customer_id: contact.id, type: 'internal_note',
            content: '**Encerramento pendente**: Cliente confirmou encerramento mas tags obrigatórias estão ausentes. Adicione tags e feche manualmente.',
            channel: responseChannel,
            metadata: { source: 'ai_close_blocked_tags' }
          });
          return new Response(JSON.stringify({ status: 'blocked', reason: 'missing_tags' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
      
      // TUDO OK → Chamar close-conversation
      const closeMsg = 'Foi um prazer ajudar! Seu atendimento será encerrado agora. Até a próxima! 😊';
      await supabaseClient.from('messages').insert({
        conversation_id: conversationId, content: closeMsg,
        sender_type: 'user', is_ai_generated: true, is_bot_message: true
      });
      if (responseChannel === 'whatsapp' || responseChannel === 'whatsapp_meta') {
        await supabaseClient.functions.invoke('send-meta-whatsapp', {
          body: { conversationId, message: closeMsg }
        });
      }
      
      // Invocar close-conversation (reuso total de CSAT, métricas, timeline)
      const { data: closeResult, error: closeError } = await supabaseClient.functions.invoke('close-conversation', {
        body: {
          conversationId,
          userId: conversation.assigned_to || 'ai-autopilot',
          sendCsat: true
        }
      });
      
      if (closeError) {
        console.error('[ai-autopilot-chat] ❌ Erro ao encerrar conversa:', closeError);
      } else {
        console.log('[ai-autopilot-chat] ✅ Conversa encerrada com sucesso via close-conversation');
      }
      
      // Limpar metadata
      await supabaseClient.from('conversations')
        .update({ customer_metadata: cleanMeta })
        .eq('id', conversationId);
      
      return new Response(JSON.stringify({ status: 'applied', action: 'conversation_closed' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      
    } else if (noPatterns.test(msgLower)) {
      console.log('[ai-autopilot-chat] ❌ Cliente NÃO quer encerrar');
      const cleanMeta = { ...closeMeta };
      delete cleanMeta.awaiting_close_confirmation;
      delete cleanMeta.close_reason;
      await supabaseClient.from('conversations')
        .update({ customer_metadata: cleanMeta })
        .eq('id', conversationId);
      // Não retorna - deixa cair no fluxo normal para IA responder
      // A IA vai ver a mensagem "não" e continuar o atendimento
    } else {
      // Ambíguo - repetir pergunta
      const ambiguousMsg = 'Só confirmando: posso encerrar seu atendimento? Responda **sim** ou **não**.';
      await supabaseClient.from('messages').insert({
        conversation_id: conversationId, content: ambiguousMsg,
        sender_type: 'user', is_ai_generated: true, is_bot_message: true
      });
      if (responseChannel === 'whatsapp' || responseChannel === 'whatsapp_meta') {
        await supabaseClient.functions.invoke('send-meta-whatsapp', {
          body: { conversationId, message: ambiguousMsg }
        });
      }
      return new Response(JSON.stringify({ status: 'awaiting_confirmation' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }
}
```

### 3. Handler da tool `close_conversation` no loop de tool calls (~linha 6817, após `request_human_agent`)

```typescript
// TOOL: close_conversation - Encerramento autônomo com confirmação
else if (toolCall.function.name === 'close_conversation') {
  try {
    const args = JSON.parse(toolCall.function.arguments);
    console.log('[ai-autopilot-chat] 🔒 close_conversation chamado:', args);
    
    const currentMeta = conversation.customer_metadata || {};
    
    if (args.customer_confirmed === false || !currentMeta.awaiting_close_confirmation) {
      // ETAPA 1: Perguntar confirmação
      await supabaseClient.from('conversations')
        .update({
          customer_metadata: {
            ...currentMeta,
            awaiting_close_confirmation: true,
            close_reason: args.reason || 'assunto_resolvido'
          }
        })
        .eq('id', conversationId);
      
      assistantMessage = 'Fico feliz em ter ajudado! 😊 Posso encerrar seu atendimento?';
      console.log('[ai-autopilot-chat] ⏳ Aguardando confirmação do cliente para encerrar');
    }
    // Se customer_confirmed=true, o detector (ponto 2) já cuida na próxima mensagem
    
  } catch (error) {
    console.error('[ai-autopilot-chat] ❌ Erro em close_conversation:', error);
    assistantMessage = 'Ocorreu um erro. Posso ajudar com mais alguma coisa?';
  }
}
```

### 4. Instrução no system prompt (~linha 5523, na seção de ferramentas)

Adicionar ao bloco de descrição de ferramentas:

```
- close_conversation: Encerre a conversa quando detectar que o assunto foi resolvido (cliente agradece, diz "era só isso", "obrigado, resolveu"). SEMPRE pergunte antes (customer_confirmed=false). Só use customer_confirmed=true após cliente confirmar "sim". Se cliente disser "não" ou tiver mais dúvidas, continue normalmente.
```

## Governança respeitada

| Regra | Comportamento |
|---|---|
| Kill Switch OFF | → `waiting_human`, não encerra |
| Shadow Mode ON | → Sugere internamente, não executa |
| Tags obrigatórias sem tags | → `waiting_human` + nota interna |
| CSAT | ✅ Enviado via `close-conversation` (reuso) |
| Anti-pulo | Se `awaiting_close_confirmation` não existe e `confirmed=true` → seta flag e pergunta |

## Zero regressão

- Toda a lógica de CSAT, métricas, timeline, `resolved_by` é reutilizada via `close-conversation`
- Nenhum fluxo existente é alterado
- `is_bot_message: true` em todas as mensagens da IA (regra do Super Prompt)

