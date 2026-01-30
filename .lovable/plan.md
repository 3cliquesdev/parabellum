
# Plano de Correção: Kill Switch Bloqueia TODO Envio Automático

## Diagnóstico do Problema

### Screenshot Analisado
O usuário mostrou mensagens **duplicadas** mesmo com "IA Global DESLIGADA":
- Mensagem "Que legal saber que você tem interesse!" aparece 3x
- Mensagens vindas de "Assistente Virtual" E "Atendente" simultaneamente
- Banner mostra: "IA Global está DESLIGADA. Esta conversa está na fila IA mas não está sendo respondida"

### Causa Raiz Identificada

| Problema | Local | Impacto |
|----------|-------|---------|
| Kill Switch não verificado no message-listener | `message-listener/index.ts` | Fluxos enviam mensagens mesmo com IA OFF |
| Kill Switch não verificado no process-chat-flow | `process-chat-flow/index.ts` | Respostas automáticas continuam |
| Fallback automático sem controle | `message-listener:173-191` | Envia mensagem + transfere mesmo com IA OFF |
| Múltiplos pontos de inserção | 8+ edge functions | Sem controle centralizado |

### Arquitetura Atual (Problemática)

```text
Cliente envia mensagem
        ↓
message-listener (NÃO verifica Kill Switch)
        ↓
process-chat-flow (NÃO verifica Kill Switch)
        ↓
├─ Se fluxo tem resposta → ENVIA MENSAGEM (problema!)
├─ Se não tem AINode → ENVIA FALLBACK (problema!)
└─ Se tem AINode → ai-autopilot-chat (verifica Kill Switch) → NÃO envia

Resultado: Algumas mensagens são enviadas, outras não → DUPLICAÇÃO
```

---

## Solução Proposta

### Princípio Core: "Kill Switch = Zero Envio Automático"

Quando `ai_global_enabled = false`:
- ❌ IA não responde
- ❌ Fluxo não envia mensagem
- ❌ Fallback não é enviado
- ✅ Apenas humanos podem responder

### Nova Arquitetura

```text
Cliente envia mensagem
        ↓
message-listener
        ↓
┌─ VERIFICAR Kill Switch PRIMEIRO ─┐
│                                   │
│  if (!ai_global_enabled) {        │
│    return { skip_all_auto: true } │
│  }                                │
└───────────────────────────────────┘
        ↓ (se IA ligada)
process-chat-flow
        ↓
├─ Se fluxo tem resposta → Envia
├─ Se não tem AINode → Envia fallback
└─ Se tem AINode → ai-autopilot-chat → Responde

        ↓ (se IA desligada)
NADA acontece. Conversa fica na fila humana.
```

---

## Alterações Detalhadas

### 1. message-listener — Adicionar Kill Switch

**Arquivo**: `supabase/functions/message-listener/index.ts`

**Alteração**: Verificar `ai_global_enabled` NO INÍCIO da função, antes de qualquer processamento

```typescript
// ADICIONAR após linha 21 (após verificar sender_type)

// ============================================================
// 🛑 KILL SWITCH: Se IA global desligada, NÃO processar nada
// Apenas logar e retornar - humano precisa assumir
// ============================================================
import { getAIConfig } from "../_shared/ai-config-cache.ts";

const aiConfig = await getAIConfig(supabase);

if (!aiConfig.ai_global_enabled) {
  // Exceção: modo de teste individual
  const isTestMode = conversation?.is_test_mode === true;
  
  if (!isTestMode) {
    console.log('[message-listener] 🛑 KILL SWITCH ATIVO - Nenhum envio automático');
    return new Response(JSON.stringify({ 
      status: 'kill_switch_active',
      action: 'skip_all_auto',
      reason: 'ai_global_enabled = false',
      message: 'Aguardando atendente humano'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } else {
    console.log('[message-listener] 🧪 Kill Switch ativo, mas MODO TESTE permite processar');
  }
}
```

**Impacto**: 
- Zero mensagens automáticas quando Kill Switch ativo
- Conversas ficam na fila esperando humano
- Modo de teste continua funcionando

### 2. process-chat-flow — Adicionar Kill Switch

**Arquivo**: `supabase/functions/process-chat-flow/index.ts`

**Alteração**: Verificar Kill Switch antes de processar qualquer nó

```typescript
// ADICIONAR após linha 224 (após parsear body)

import { getAIConfig } from "../_shared/ai-config-cache.ts";

const aiConfig = await getAIConfig(supabaseClient);

if (!aiConfig.ai_global_enabled) {
  console.log('[process-chat-flow] 🛑 KILL SWITCH ATIVO - Retornando sem processar');
  return new Response(JSON.stringify({ 
    useAI: false,
    aiNodeActive: false,
    skipAutoResponse: true, // 🆕 Flag para indicar que não deve enviar nada
    reason: 'kill_switch_active',
    message: 'IA desligada globalmente - aguardando humano'
  }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
}
```

### 3. message-listener — Respeitar `skipAutoResponse`

**Arquivo**: `supabase/functions/message-listener/index.ts`

**Alteração**: NÃO enviar fallback quando `skipAutoResponse = true`

```typescript
// MODIFICAR linha 173-191

// Se não há fluxo ativo e não há AIResponseNode
if (!flowData.flowId && !flowData.response) {
  // 🆕 REGRA: Se skipAutoResponse, NÃO enviar fallback
  if (flowData.skipAutoResponse) {
    console.log('[message-listener] ⏸️ skipAutoResponse = true - Não enviando fallback');
    
    // Apenas marcar para transferência, sem enviar mensagem
    await supabase
      .from('conversations')
      .update({ ai_mode: 'waiting_human' })
      .eq('id', record.conversation_id);
    
    return new Response(JSON.stringify({ 
      status: 'waiting_human_no_message', 
      reason: 'kill_switch_active'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Comportamento original (só quando IA está ligada)
  const fallbackMessage = flowData.fallbackMessage || 
    'No momento não tenho essa informação. Vou te encaminhar para um atendente humano.';
  // ...resto do código...
}
```

### 4. handle-whatsapp-event — Padronizar Kill Switch

**Arquivo**: `supabase/functions/handle-whatsapp-event/index.ts`

**Alteração**: Usar cache e bloquear envio automático completo

```typescript
// MODIFICAR linhas 1093-1111

import { getAIConfig } from "../_shared/ai-config-cache.ts";

// Usar cache em vez de query direta
const aiConfig = await getAIConfig(supabase);

console.log('[handle-whatsapp-event] 🤖 AI Global Status (cached):', 
  aiConfig.ai_global_enabled ? 'ENABLED' : 'DISABLED');

// 🛑 KILL SWITCH: Não processar IA nem fluxo
if (!aiConfig.ai_global_enabled) {
  const isTestMode = currentConv?.is_test_mode === true;
  
  if (!isTestMode) {
    console.log('[handle-whatsapp-event] 🛑 Kill Switch ativo - Nenhum envio automático');
    
    // Apenas garantir que conversa está na fila humana
    if (conversationAIMode === 'autopilot') {
      await supabase
        .from('conversations')
        .update({ ai_mode: 'waiting_human' })
        .eq('id', conversationId);
    }
    
    // NÃO chamar ai-autopilot-chat nem process-chat-flow
    return new Response(JSON.stringify({ 
      success: true,
      message_saved: true,
      ai_processed: false,
      reason: 'kill_switch_active'
    }), { headers: corsHeaders });
  }
}
```

---

## Arquivos a Modificar

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `message-listener/index.ts` | Modificar | Adicionar Kill Switch no início + respeitar skipAutoResponse |
| `process-chat-flow/index.ts` | Modificar | Adicionar Kill Switch + retornar skipAutoResponse |
| `handle-whatsapp-event/index.ts` | Modificar | Usar cache + bloquear todos envios automáticos |

---

## Seção Técnica

### Flag `skipAutoResponse`

Nova flag no contrato entre `process-chat-flow` e `message-listener`:

```typescript
interface FlowResponse {
  useAI: boolean;
  aiNodeActive: boolean;
  skipAutoResponse: boolean; // 🆕 Quando true, não enviar NADA automático
  reason: string;
  response?: string;
  // ...outros campos
}
```

### Comportamento por Estado

| ai_global_enabled | is_test_mode | Resultado |
|-------------------|--------------|-----------|
| `true` | qualquer | Processa normalmente |
| `false` | `true` | Processa (modo teste) |
| `false` | `false` | **BLOQUEIA TUDO** - Aguarda humano |

### Fluxo de Decisão

```text
Mensagem do cliente
       ↓
┌─ Kill Switch? ─────────────────────┐
│                                     │
│  ai_global_enabled = false?         │
│       ↓                             │
│  ┌─ Test Mode? ─┐                   │
│  │              │                   │
│  │ SIM → Prossegue                  │
│  │ NÃO → PARA AQUI                  │
│  │       ↓                          │
│  │  { skipAutoResponse: true }      │
│  │  ai_mode → 'waiting_human'       │
│  │  NENHUMA mensagem enviada        │
│  └──────────────────────────────────┘
```

---

## Critérios de Aceitação

| Teste | Resultado Esperado |
|-------|-------------------|
| Kill Switch OFF + mensagem cliente | ✅ Zero mensagens automáticas enviadas |
| Kill Switch OFF + fluxo ativo | ✅ Fluxo NÃO envia resposta |
| Kill Switch OFF + fallback | ✅ Fallback NÃO é enviado |
| Kill Switch OFF + conversa | ✅ ai_mode muda para `waiting_human` |
| Kill Switch ON | ✅ Comportamento normal |
| Kill Switch OFF + Modo Teste | ✅ Processa normalmente (exceção) |

---

## Ordem de Implementação

1. **process-chat-flow**: Adicionar Kill Switch + `skipAutoResponse`
2. **message-listener**: Adicionar Kill Switch no início
3. **message-listener**: Respeitar `skipAutoResponse` no fallback
4. **handle-whatsapp-event**: Padronizar com cache
5. **Deploy**: Publicar todas as edge functions
6. **Validação**: Testar cenários de duplicação

---

## Impacto nos Fluxos Atuais

### Antes (Problemático)
```text
Kill Switch OFF:
- ai-autopilot-chat: ❌ Não envia (correto)
- process-chat-flow: ✅ Envia resposta (errado!)
- message-listener: ✅ Envia fallback (errado!)

Resultado: Duplicação de mensagens
```

### Depois (Corrigido)
```text
Kill Switch OFF:
- message-listener: ❌ Para no início
- process-chat-flow: ❌ Retorna skipAutoResponse
- ai-autopilot-chat: ❌ Nunca é chamado

Resultado: Zero mensagens automáticas
```

---

## Garantias de Segurança

| Garantia | Implementação |
|----------|---------------|
| Zero mensagens quando Kill Switch OFF | ✅ Verificação no início do pipeline |
| Modo Teste funciona independente | ✅ Exceção explícita para `is_test_mode` |
| Conversa vai para fila humana | ✅ `ai_mode = 'waiting_human'` automático |
| Cache otimizado | ✅ Usa `getAIConfig()` com TTL 60s |
| Sem breaking changes | ✅ Apenas adiciona verificações |
