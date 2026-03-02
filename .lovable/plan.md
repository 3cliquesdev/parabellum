

# Diagnóstico: Conversa #54269D6E não foi transferida

## Causa Raiz

O fluxo Master Flow seguiu este caminho:
1. Usuário respondeu "4" (Outros) no menu
2. Auto-avanço entregou a mensagem "Estou transferindo você agora..."
3. Avaliou a condição de inatividade → `false` → próximo nó = **TransferNode** `1769460331172` (Suporte Sistema)
4. **BUG**: O código de auto-avanço para nós `message` (linhas 1905-2014 do `process-chat-flow`) não trata o caso de o nó resultante ser um `transfer`. Ele simplesmente salva o `current_node_id` como o transfer node e retorna uma resposta genérica **sem** `transfer: true` nem `departmentId`
5. O webhook não executa a transferência porque não recebe esses campos
6. Conversa fica presa em `ai_mode: waiting_human`, `department: null`, `assigned_to: null`

O tratamento de TransferNode só existe em dois lugares:
- Na travessia manual (linha 945) 
- Quando é o `nextNode` direto da resposta do usuário (linha 1838)

Mas **não** existe após o loop de auto-avanço de message nodes (linha 1957+).

## Solução

### `supabase/functions/process-chat-flow/index.ts`

Após o loop de auto-avanço de message nodes (depois da linha 1957, antes da linha 1984), adicionar tratamento para `nextNode.type === 'transfer'`:

```typescript
// Se chegou a transfer após auto-avanço de messages, executar transferência
if (nextNode.type === 'transfer') {
  console.log(`[process-chat-flow] 🔄 Transfer node after message chain: ${nextNode.id}`);
  
  // Entregar mensagens intermediárias acumuladas
  if (extraMessages.length > 0) {
    for (const msg of extraMessages) {
      await deliverFlowMessage(msg);
    }
  }
  
  // Entregar mensagem do transfer node
  const transferMsg = replaceVariables(nextNode.data?.message || "Transferindo...", variablesContext);
  await deliverFlowMessage(transferMsg);
  
  // Completar flow state como transferred
  await supabaseClient
    .from('chat_flow_states')
    .update({
      collected_data: collectedData,
      current_node_id: nextNode.id,
      status: 'transferred',
      completed_at: new Date().toISOString(),
    })
    .eq('id', activeState.id);

  return new Response(JSON.stringify({
    useAI: false,
    transfer: true,
    departmentId: nextNode.data?.department_id || null,
    transferType: nextNode.data?.transfer_type,
    collectedData,
    flowId: activeState.flow_id,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
```

Inserir este bloco entre o tratamento de `end` node (linha 1982) e o fallback genérico (linha 1984).

### Fix imediato para a conversa #54269D6E

Após o deploy, a conversa atual precisa ser corrigida manualmente no banco:
- Setar `department = 'fd4fcc90-22e4-4127-ae23-9c9ecb6654b4'` (Suporte Sistema)
- Setar `ai_mode = 'waiting_human'`
- Atualizar `chat_flow_states` para `status = 'transferred'`

### Arquivos alterados
- `supabase/functions/process-chat-flow/index.ts` — adicionar handler de transfer após auto-avanço de messages

### Sem risco de regressão
- O tratamento de transfer nos outros caminhos (manual trigger e nextNode direto) permanece intacto
- Apenas adiciona um handler que estava faltando

