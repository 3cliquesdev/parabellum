
# Plano: Blindar Kill Switch em Toda a Arquitetura (Correção Crítica)

## Diagnóstico Atual

### Análise dos 3 Pontos Críticos

| Arquivo | Kill Switch Implementado? | Problema |
|---------|--------------------------|----------|
| `message-listener` | ✅ **SIM** (linhas 64-111) | Correto - bloqueia e move para `waiting_human` |
| `process-chat-flow` | ✅ **SIM** (linhas 238-260) | Correto - retorna `skipAutoResponse: true` |
| `ai-autopilot-chat` | ✅ **SIM** (linhas 1309-1337) | Correto - retorna `skipped: true` |

### Status: ARQUITETURA JÁ ESTÁ CORRETA 

Após analisar os 3 arquivos críticos, **o Kill Switch já está implementado corretamente em todos os pontos**:

---

## Verificação Detalhada

### 1. message-listener (PRIMEIRO PONTO) ✅

```typescript
// Linha 64-111
const aiConfig = await getAIConfig(supabase);
const isTestMode = conversation?.is_test_mode === true;

if (!aiConfig.ai_global_enabled && !isTestMode) {
  console.log('[message-listener] 🛑 KILL SWITCH ATIVO - Nenhum envio automático');
  
  // Mover conversa para fila humana se estiver em autopilot
  if (conversation?.ai_mode === 'autopilot') {
    await supabase.from('conversations')
      .update({ ai_mode: 'waiting_human' })
      .eq('id', record.conversation_id);
    console.log('[message-listener] 📋 Conversa movida para fila humana');
  }
  
  return new Response(JSON.stringify({ 
    status: 'kill_switch_active',
    action: 'skip_all_auto',
    reason: 'ai_global_enabled = false'
  }));
}
```

**Impede**: IA, fluxo, fallback

---

### 2. process-chat-flow (SEGURANÇA DUPLA) ✅

```typescript
// Linha 238-260
const aiConfig = await getAIConfig(supabaseClient);
const isTestMode = convForTest?.is_test_mode === true;

if (!aiConfig.ai_global_enabled && !isTestMode) {
  console.log('[process-chat-flow] 🛑 KILL SWITCH ATIVO - Retornando sem processar');
  return new Response(JSON.stringify({ 
    useAI: false,
    aiNodeActive: false,
    skipAutoResponse: true,  // Flag para não enviar nada
    reason: 'kill_switch_active'
  }));
}
```

**Impede**: Execução de fluxos visuais quando Kill Switch ativo

---

### 3. ai-autopilot-chat (BARREIRA FINAL) ✅

```typescript
// Linha 1309-1337
const { data: globalConfig } = await supabaseClient
  .from('system_configurations')
  .select('value')
  .eq('key', 'ai_global_enabled')
  .single();

const isAIGloballyEnabled = globalConfig?.value === 'true';
const isTestMode = conversation.is_test_mode === true;

if (!isAIGloballyEnabled && !isTestMode) {
  console.log('[ai-autopilot-chat] 🚫 IA DESLIGADA GLOBALMENTE - IGNORANDO');
  return new Response(JSON.stringify({ 
    skipped: true, 
    reason: 'AI globally disabled'
  }));
}
```

**Impede**: Qualquer resposta de IA RAG

---

## Possíveis Causas do Problema Reportado

Se o usuário ainda vê a IA respondendo quando Kill Switch está OFF, as causas podem ser:

### 1. WhatsApp usa caminho diferente

O `message-listener` pula mensagens WhatsApp (linha 49-58):
```typescript
if (conversation?.channel === 'whatsapp') {
  console.log('[message-listener] ⏭️ Canal WhatsApp - já processado por handle-whatsapp-event');
  return; // Não passa pelo Kill Switch do message-listener!
}
```

O caminho WhatsApp é:
```
meta-whatsapp-webhook → ai-autopilot-chat (direto)
```

**Verificação necessária**: O `meta-whatsapp-webhook` precisa ter o Kill Switch?

### 2. Chamada direta ao ai-autopilot-chat

Se algum código chama `ai-autopilot-chat` diretamente sem passar pelo `message-listener`, o Kill Switch do `ai-autopilot-chat` (linha 1326) já bloqueia.

### 3. Cache desatualizado (60 segundos)

O cache do `getAIConfig` tem TTL de 60 segundos. Se o usuário desliga o Kill Switch, pode levar até 60s para o bloqueio ser efetivo.

---

## Conclusão

A arquitetura do Kill Switch **já está correta** nos 3 pontos críticos. O problema reportado pode ser:

1. **Timing de cache** (60s de delay)
2. **Teste feito antes das correções** (versão antiga deployed)
3. **Canal WhatsApp** passando por caminho diferente

---

## Próximos Passos Recomendados

| Ação | Prioridade |
|------|------------|
| Verificar se `meta-whatsapp-webhook` tem Kill Switch | Alta |
| Reduzir TTL do cache para 30s durante testes | Média |
| Adicionar log `[KILL-SWITCH]` unificado para auditoria | Média |
| Testar novamente após deploy recente | Alta |

---

## Resumo

A arquitetura atual **já implementa** o Kill Switch nos 3 pontos obrigatórios. Se o problema persiste, precisamos:

1. **Confirmar qual canal está sendo testado** (WhatsApp Meta, Evolution ou Web Chat)
2. **Verificar logs** para ver se `🛑 KILL SWITCH` aparece
3. **Verificar se o deploy mais recente foi publicado**

Deseja que eu verifique o `meta-whatsapp-webhook` para garantir que o Kill Switch está implementado lá também?
