

# Plano: Ajuste Anti-Escape — Fluxo Soberano sobre TransferNode

## Resumo Executivo

Este ajuste garante que **a IA nunca decide transferência**. Quando detecta uma violação de contrato (escape attempt), ela apenas sinaliza erro. O `process-chat-flow` é quem ativa o TransferNode.

---

## O Que Será Ajustado

### 1. ai-autopilot-chat — Sinalizar erro, não decidir

**Antes (atual):**
```typescript
return new Response(JSON.stringify({
  forceTransfer: true,  // ❌ IA decidindo transferência
  reason: 'ai_contract_violation',
  ...
}));
```

**Depois:**
```typescript
return new Response(JSON.stringify({
  contractViolation: true,  // ✅ IA apenas sinaliza erro
  reason: 'ai_contract_violation',
  violationType: 'escape_attempt',
  original_response: assistantMessage.substring(0, 200),
  flow_context: {
    flow_id: flow_context.flow_id,
    node_id: flow_context.node_id
  }
}));
```

### 2. message-listener — Delegar decisão ao fluxo

**Antes (atual):**
```typescript
// Verificar se IA tentou escapar do contrato
if (autopilotData.forceTransfer) {
  // ❌ Decide transferência diretamente aqui
  await supabase.from('conversations')
    .update({ ai_mode: 'waiting_human' })
    .eq('id', record.conversation_id);
}
```

**Depois:**
```typescript
// Verificar se IA sinalizou violação de contrato
if (autopilotData.contractViolation) {
  console.log('[message-listener] ⚠️ IA sinalizou violação de contrato');
  
  // ✅ Delegar para process-chat-flow ativar TransferNode
  const transferResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-chat-flow`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    },
    body: JSON.stringify({
      conversationId: record.conversation_id,
      userMessage: record.content,
      contractViolation: true,
      violationReason: autopilotData.reason,
      activateTransfer: true  // Sinaliza para o fluxo ativar TransferNode
    })
  });
  
  const transferData = await transferResponse.json();
  console.log('[message-listener] 📋 Transfer delegated to flow:', transferData);
  
  return new Response(JSON.stringify({ 
    status: 'contract_violation_delegated', 
    reason: autopilotData.reason,
    transfer_handled_by: 'process-chat-flow'
  }), { ... });
}
```

### 3. process-chat-flow — Ativar TransferNode quando solicitado

Adicionar tratamento para quando recebe `activateTransfer: true`:

```typescript
// No início do handler, verificar se é uma delegação de violação
if (body.contractViolation && body.activateTransfer) {
  console.log('[process-chat-flow] ⚠️ Contract violation received - activating TransferNode');
  
  // Buscar ou criar TransferNode do fluxo atual
  const transferMessage = 'Vou transferir você para um atendente humano.';
  
  // Atualizar conversa para waiting_human
  await supabaseClient.from('conversations')
    .update({ ai_mode: 'waiting_human' })
    .eq('id', conversationId);
  
  // Inserir mensagem de transferência
  await supabaseClient.from('messages').insert({
    conversation_id: conversationId,
    content: transferMessage,
    sender_type: 'user',
    is_ai_generated: true,
    channel: conversation?.channel || 'web_chat'
  });
  
  return new Response(JSON.stringify({
    useAI: false,
    aiNodeActive: false,
    transferActivated: true,
    reason: body.violationReason || 'contract_violation'
  }), { ... });
}
```

---

## Fluxo de Dados Atualizado

```text
┌──────────────────┐
│   Resposta IA    │
└────────┬─────────┘
         │
    ┌────┴────┐
    │ Escape? │
    └────┬────┘
         │ SIM
         ▼
┌────────────────────────┐
│  ai-autopilot-chat     │
│  contractViolation:    │
│  true                  │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│   message-listener     │
│   (detecta violação)   │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│  process-chat-flow     │
│  activateTransfer:true │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│  TransferNode ativado  │
│  (fluxo soberano)      │
└────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/ai-autopilot-chat/index.ts` | Trocar `forceTransfer` por `contractViolation` |
| `supabase/functions/message-listener/index.ts` | Delegar para `process-chat-flow` em vez de decidir |
| `supabase/functions/process-chat-flow/index.ts` | Adicionar handler para `activateTransfer: true` |

---

## Benefícios do Ajuste

| Antes | Depois |
|-------|--------|
| IA retorna `forceTransfer: true` | IA retorna `contractViolation: true` |
| message-listener decide transferência | message-listener delega para fluxo |
| Transferência hardcoded | TransferNode do fluxo é ativado |
| IA tem poder de decisão | Fluxo é 100% soberano |

---

## Próximos Passos (Após Aprovação)

1. Ajustar retorno em `ai-autopilot-chat` (linhas 7291-7302)
2. Ajustar handler em `message-listener` (linhas 205-228)
3. Adicionar handler de `activateTransfer` em `process-chat-flow`
4. Deploy das 3 Edge Functions
5. Testar fluxo de violação de contrato

