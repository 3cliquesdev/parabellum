
## Plano: Corrigir Wrapper Legacy para Suportar Multi-Provider

### Problema Identificado

A IA está gerando respostas mas as mensagens **não são enviadas ao cliente** porque o wrapper `getWhatsAppInstanceForConversation` está **hardcoded para usar 'evolution'** como provider, mesmo quando a conversa está configurada para usar **Meta WhatsApp Cloud API**.

**Linha do problema (202-215):**
```typescript
async function getWhatsAppInstanceForConversation(...) {
  const result = await getWhatsAppInstanceWithProvider(
    supabaseClient,
    conversationId,
    conversationWhatsappInstanceId,
    'evolution', // ← SEMPRE EVOLUTION (ERRADO!)
    null
  );
}
```

**Impacto:** 
- Todas as mensagens automáticas (welcome, handoff, AI responses, email prompts) que usam o wrapper legacy não são enviadas para conversas Meta
- O log mostra `❌ Nenhuma instância WhatsApp disponível` porque Evolution está desconectado

---

### Solucao

Atualizar o wrapper `getWhatsAppInstanceForConversation` para **buscar dinamicamente** os dados de provider da conversa antes de chamar a função principal.

---

### Implementacao

**Arquivo:** `supabase/functions/ai-autopilot-chat/index.ts`

**Linhas afetadas:** 202-215

**Codigo atual:**
```typescript
async function getWhatsAppInstanceForConversation(
  supabaseClient: any,
  conversationId: string,
  conversationWhatsappInstanceId: string | null
): Promise<any | null> {
  const result = await getWhatsAppInstanceWithProvider(
    supabaseClient,
    conversationId,
    conversationWhatsappInstanceId,
    'evolution', // Hardcoded - PROBLEMA
    null
  );
  return result?.instance || null;
}
```

**Codigo corrigido:**
```typescript
async function getWhatsAppInstanceForConversation(
  supabaseClient: any,
  conversationId: string,
  conversationWhatsappInstanceId: string | null,
  conversationData?: any // Novo: passar dados da conversa se já disponíveis
): Promise<{ instance: any; provider: 'meta' | 'evolution' } | null> {
  
  // Se não recebeu dados da conversa, buscar do banco
  let whatsappProvider = conversationData?.whatsapp_provider || null;
  let whatsappMetaInstanceId = conversationData?.whatsapp_meta_instance_id || null;
  
  if (!whatsappProvider && conversationId) {
    const { data: convData } = await supabaseClient
      .from('conversations')
      .select('whatsapp_provider, whatsapp_meta_instance_id')
      .eq('id', conversationId)
      .maybeSingle();
    
    whatsappProvider = convData?.whatsapp_provider || 'evolution';
    whatsappMetaInstanceId = convData?.whatsapp_meta_instance_id || null;
  }
  
  return getWhatsAppInstanceWithProvider(
    supabaseClient,
    conversationId,
    conversationWhatsappInstanceId,
    whatsappProvider || 'evolution',
    whatsappMetaInstanceId
  );
}
```

---

### Atualizar Chamadas Legacy

Todas as chamadas ao wrapper também precisam ser atualizadas para usar o novo formato de retorno que inclui o `provider`:

**Antes (múltiplas ocorrências):**
```typescript
const whatsappInstance = await getWhatsAppInstanceForConversation(...);
if (whatsappInstance) {
  await supabaseClient.functions.invoke('send-whatsapp-message', {...});
}
```

**Depois:**
```typescript
const whatsappResult = await getWhatsAppInstanceForConversation(
  supabaseClient, conversationId, conversation.whatsapp_instance_id, conversation
);

if (whatsappResult) {
  if (whatsappResult.provider === 'meta') {
    await supabaseClient.functions.invoke('send-meta-whatsapp', {
      body: {
        instance_id: whatsappResult.instance.id,
        phone_number: contact.phone?.replace(/\D/g, ''),
        message: messageContent,
        conversation_id: conversationId
      }
    });
  } else {
    await supabaseClient.functions.invoke('send-whatsapp-message', {
      body: {
        instanceId: whatsappResult.instance.id,
        ...
      }
    });
  }
}
```

---

### Locais a Atualizar

| Linha | Contexto | Alteração |
|-------|----------|-----------|
| 202-215 | Wrapper `getWhatsAppInstanceForConversation` | Refatorar para buscar provider dinamicamente |
| 776-796 | Welcome message | Usar nova lógica multi-provider |
| 948-972 | Handoff message | Usar nova lógica multi-provider |
| 1010-1035 | Cache response | Usar nova lógica multi-provider |
| 1174-1194 | Email request (Identity Wall) | Usar nova lógica multi-provider |
| 1236-1256 | Email request 2 | Usar nova lógica multi-provider |
| 1394-1414 | Chat flow node | Usar nova lógica multi-provider |
| 1523-1543 | Chat flow node 2 | Usar nova lógica multi-provider |
| 2200-2220 | Email request 3 | Usar nova lógica multi-provider |
| 2274-2294 | Email request 4 | Usar nova lógica multi-provider |

---

### Resultado Esperado

Apos a correção:
- Mensagens de welcome, handoff e respostas AI serão enviadas via Meta API para conversas Meta
- Conversas Evolution continuarão funcionando normalmente (backward compatible)
- O log passará a mostrar: `✅ Usando instância META: {...}`

---

### Secao Tecnica

**Helper function refatorada:**

```typescript
// Wrapper com suporte multi-provider (linha 202-235)
async function getWhatsAppInstanceForConversation(
  supabaseClient: any,
  conversationId: string,
  conversationWhatsappInstanceId: string | null,
  conversationData?: { 
    whatsapp_provider?: string; 
    whatsapp_meta_instance_id?: string; 
  }
): Promise<WhatsAppInstanceResult | null> {
  
  let provider = conversationData?.whatsapp_provider;
  let metaInstanceId = conversationData?.whatsapp_meta_instance_id;
  
  // Buscar dados da conversa se não foram passados
  if (!provider && conversationId) {
    const { data } = await supabaseClient
      .from('conversations')
      .select('whatsapp_provider, whatsapp_meta_instance_id')
      .eq('id', conversationId)
      .maybeSingle();
    
    provider = data?.whatsapp_provider;
    metaInstanceId = data?.whatsapp_meta_instance_id;
  }
  
  return getWhatsAppInstanceWithProvider(
    supabaseClient,
    conversationId,
    conversationWhatsappInstanceId,
    provider || 'evolution',
    metaInstanceId || null
  );
}
```

**Bloco de envio padronizado:**

```typescript
// Função auxiliar para enviar mensagem (criar por volta da linha 220)
async function sendWhatsAppMessage(
  supabaseClient: any,
  whatsappResult: WhatsAppInstanceResult,
  phoneNumber: string,
  message: string,
  conversationId: string
): Promise<void> {
  if (whatsappResult.provider === 'meta') {
    console.log('[ai-autopilot-chat] 📤 Enviando via Meta WhatsApp API');
    await supabaseClient.functions.invoke('send-meta-whatsapp', {
      body: {
        instance_id: whatsappResult.instance.id,
        phone_number: phoneNumber.replace(/\D/g, ''),
        message,
        conversation_id: conversationId
      }
    });
  } else {
    console.log('[ai-autopilot-chat] 📤 Enviando via Evolution API');
    await supabaseClient.functions.invoke('send-whatsapp-message', {
      body: {
        instanceId: whatsappResult.instance.id,
        instanceName: whatsappResult.instance.instance_name,
        phoneNumber: phoneNumber.replace(/\D/g, ''),
        message
      }
    });
  }
}
```

**Edge Function a fazer redeploy:**
- `ai-autopilot-chat`
