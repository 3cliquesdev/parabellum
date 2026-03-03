

# Corrigir: Guard de ai_mode bloqueia fluxo ativo (conversa #735C859A)

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Problema raiz

A conversa #735C859A está com fluxo ativo no nó `ask_options` (status `waiting_input`), mas o `ai_mode` foi mudado para `copilot` durante o processamento do nó AI anterior. Quando o cliente respondeu "Sim", o `process-chat-flow` bloqueou com a mensagem: `🛡️ PROTEÇÃO: ai_mode=copilot - NÃO processar fluxo/IA`.

**Cadeia do bug:**
1. Cliente diz "Estou aguardando o retorno do setor logistico"
2. Nó `ai_response` (ia_entrada) processa → IA executa tool call `handoff_to_human` → **seta `ai_mode = copilot`** (linha 7312 do ai-autopilot-chat)
3. Fallback/exit keyword detectado → retorna `flow_advance_needed`
4. Webhook re-invoca `process-chat-flow` com `forceAIExit` → fluxo avança ao nó `ask_options` e envia "Você já é nosso cliente?"
5. Cliente responde "Sim" → webhook chama `process-chat-flow`
6. **Guard bloqueia**: `ai_mode=copilot` → resposta ignorada, fluxo trava

O `ai_mode` foi corrompido pelo handoff tool call da IA DENTRO do nó do fluxo, mas o fluxo continuou avançando. O guard não verifica se existe um fluxo ativo.

## Correção

**Arquivo:** `supabase/functions/process-chat-flow/index.ts` (linhas 442-454)

Adicionar verificação de fluxo ativo ANTES de bloquear. Se existe um `chat_flow_state` ativo (`waiting_input`, `active`, `in_progress`) para essa conversa, o fluxo tem soberania e deve continuar processando — independente do `ai_mode`. Adicionalmente, restaurar `ai_mode = autopilot` para garantir consistência.

```typescript
// ANTES (bug):
if ((currentAiMode === 'waiting_human' || currentAiMode === 'copilot' || currentAiMode === 'disabled') && !isTestMode) {
  // bloqueia sempre
}

// DEPOIS (fix):
if ((currentAiMode === 'waiting_human' || currentAiMode === 'copilot' || currentAiMode === 'disabled') && !isTestMode) {
  // Verificar se existe fluxo ativo — fluxo tem soberania
  const { data: activeFlowCheck } = await supabaseClient
    .from('chat_flow_states')
    .select('id, status')
    .eq('conversation_id', conversationId)
    .in('status', ['waiting_input', 'active', 'in_progress'])
    .limit(1)
    .maybeSingle();
  
  if (activeFlowCheck) {
    console.log(`[process-chat-flow] 🔓 SOBERANIA DO FLUXO: ai_mode=${currentAiMode} mas fluxo ativo (${activeFlowCheck.status}) → processando`);
    // Restaurar ai_mode para autopilot (foi corrompido)
    await supabaseClient.from('conversations')
      .update({ ai_mode: 'autopilot' })
      .eq('id', conversationId);
  } else {
    // Sem fluxo ativo → bloquear (comportamento existente)
    console.log(`[process-chat-flow] 🛡️ PROTEÇÃO: ai_mode=${currentAiMode} - NÃO processar fluxo/IA`);
    return ...;
  }
}
```

## Correção secundária (preventiva)

**Arquivo:** `supabase/functions/ai-autopilot-chat/index.ts` (linhas 7311-7315)

Quando o handoff tool call é executado e `flow_context` existe, NÃO mudar `ai_mode` para copilot — pois o fluxo controlará a transição.

```typescript
// Antes de setar ai_mode = copilot, verificar se há fluxo ativo
if (!flow_context) {
  await supabaseClient.from('conversations')
    .update({ ai_mode: 'copilot' })
    .eq('id', conversationId);
}
```

## Sem risco de regressão
- Conversas sem fluxo ativo mantêm o guard exatamente como antes
- Fluxos ativos ganham soberania sobre o ai_mode
- O ai_mode é restaurado para autopilot automaticamente quando o fluxo precisa continuar
- Test mode continua com bypass independente

