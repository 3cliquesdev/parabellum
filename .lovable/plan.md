
# Plano: Corrigir Duplicação de Mensagens e Delay no Envio

## 🔍 Diagnóstico Confirmado

Após análise detalhada dos logs da edge function, banco de dados e código fonte, identifiquei **duas causas raiz**:

### Problema 1: Duplicação de Mensagens

**Evidência no banco de dados** - mesma mensagem salva 2-3 vezes:
| Timestamp | external_id | Origem |
|-----------|-------------|--------|
| 18:01:09.254 | null | SuperComposer.tsx (linha 271-278) |
| 18:01:10.778 | wamid.xxx | send-meta-whatsapp (linha 344-354) |
| 18:01:11.105 | null | SuperComposer tentando novamente? |

**Causa técnica:**
1. `SuperComposer.tsx` envia para Meta API via edge function
2. Depois, SuperComposer também salva no banco via `sendMessage.mutateAsync()`
3. MAS a edge function `send-meta-whatsapp` TAMBÉM salva no banco (linhas 337-354)
4. Resultado: **mensagem duplicada**

```typescript
// SuperComposer.tsx - linha 257-278
const { error: metaError } = await supabase.functions.invoke('send-meta-whatsapp', {
  body: {
    instance_id: whatsappMetaInstanceId,
    phone_number: contactPhone,
    message: messageContent,
    conversation_id: conversationId, // ← Passa conversation_id
  }
});

// DEPOIS também salva:
const result = await sendMessage.mutateAsync({ ... }); // ← Duplicata!
```

```typescript
// send-meta-whatsapp - linha 337-354
if (body.conversation_id && messageId) {
  await supabase.from("messages").insert({ ... }); // ← Edge function salva também!
}
```

### Problema 2: Delay no Envio (5-12 segundos)

**Causas identificadas:**
1. **Cold start** da edge function (~1-3 segundos)
2. **Upload de mídia** para Meta antes de enviar (download + upload = mais delay)
3. **Optimistic update** não está funcionando corretamente devido à duplicação

---

## 🛠️ Solução Proposta

### FASE 1: Eliminar Duplicação (CRÍTICO)

**Arquivo:** `src/components/inbox/SuperComposer.tsx`

Remover o `sendMessage.mutateAsync()` do fluxo Meta WhatsApp, já que a edge function já salva a mensagem.

**Mudanças:**
```typescript
// ANTES (linhas 255-278):
const { error: metaError } = await supabase.functions.invoke('send-meta-whatsapp', { ... });
if (metaError) throw new Error(...);

const result = await sendMessage.mutateAsync({ ... }); // ← REMOVER ISSO

// DEPOIS:
const { data: metaResponse, error: metaError } = await supabase.functions.invoke('send-meta-whatsapp', { ... });
if (metaError) throw new Error(...);

// Edge function já salvou a mensagem - não precisa salvar novamente
sentMessageId = metaResponse?.message_id || null;
```

**Mesma correção para o bloco de mídia (linhas 218-254)**

### FASE 2: Melhorar Optimistic Update

**Arquivo:** `src/hooks/useMessages.tsx`

Ajustar a lógica de detecção de duplicatas para usar `external_id` como identificador único:

```typescript
// Linha 82-101 - Adicionar verificação por external_id
if (payload.eventType === 'INSERT') {
  queryClient.setQueryData(
    ["messages", conversationId],
    (old: any[] = []) => {
      // 1. Verificar por ID real
      if (old.some(m => m.id === newMessage.id)) {
        return old;
      }
      
      // 2. Verificar por external_id (wamid)
      if (newMessage.external_id && old.some(m => m.external_id === newMessage.external_id)) {
        return old;
      }
      
      // 3. Substituir temp por real (lógica existente)
      // ...
    }
  );
}
```

### FASE 3: Adicionar Flag para Evitar Duplo-Save

**Arquivo:** `supabase/functions/send-meta-whatsapp/index.ts`

Adicionar parâmetro opcional `skip_db_save` para casos onde o chamador já vai salvar:

```typescript
interface SendMetaWhatsAppRequest {
  // ... campos existentes
  skip_db_save?: boolean; // Se true, não salva no banco (chamador irá salvar)
}

// Linha 337-354 - Condicionar o save
if (body.conversation_id && messageId && !body.skip_db_save) {
  await supabase.from("messages").insert({ ... });
}
```

Porém, a solução mais limpa é **deixar a edge function salvar** (ela tem o external_id correto) e **não salvar no frontend**.

---

## 📋 Arquivos a Modificar

| Arquivo | Alteração | Impacto |
|---------|-----------|---------|
| `src/components/inbox/SuperComposer.tsx` | Remover `sendMessage.mutateAsync()` após envio Meta | **ELIMINA DUPLICAÇÃO** |
| `src/hooks/useMessages.tsx` | Adicionar verificação por `external_id` | Prevenção extra |
| `supabase/functions/send-meta-whatsapp/index.ts` | (Opcional) Adicionar flag `skip_db_save` | Flexibilidade |

---

## 🎯 Resultado Esperado

1. **Zero duplicação**: Cada mensagem enviada aparece apenas 1 vez
2. **Delay reduzido**: Sem operação redundante de banco
3. **Optimistic update correto**: Mensagem aparece imediatamente e é substituída pela versão real do realtime
4. **Integridade**: Mensagens mantêm `external_id` (wamid) para tracking de delivery

---

## ⚠️ Considerações de Segurança

- O fluxo atual onde a edge function salva a mensagem é mais seguro pois:
  - O `external_id` (wamid) é capturado corretamente
  - O metadata inclui `whatsapp_provider: 'meta'`
  - Garante que só salva SE a mensagem foi realmente enviada

---

## 🧪 Testes Necessários

1. Enviar mensagem de texto simples → verificar 1 única entrada no banco
2. Enviar mídia (imagem/vídeo) → verificar 1 única entrada
3. Testar realtime → mensagem deve aparecer sem duplicata na UI
4. Verificar `external_id` preenchido corretamente
