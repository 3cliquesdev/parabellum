
# Ajustes de Ordem e Captura CSAT

## Resumo das Alterações

| Componente | Status Atual | Ajuste |
|------------|--------------|--------|
| `awaiting_rating` | ✅ Já existe | Nenhum |
| `extractRating` | ✅ Já simplificado (1-5 + ⭐) | Nenhum |
| Ordem CSAT → close | ⚠️ Invertida | Corrigir |

---

## Problema Atual

No `auto-close-conversations`, a sequência está **invertida**:

```text
ATUAL (ERRADO):
1. Insert mensagem de encerramento ✅
2. Adicionar tag desistência ✅
3. UPDATE conversations SET status = 'closed' ← FECHA ANTES
4. Insert mensagem CSAT ← MENSAGEM VEM DEPOIS
5. Enviar WhatsApp
```

## Correção Necessária

```text
CORRETO:
1. Insert mensagem de encerramento ✅
2. Adicionar tag desistência ✅
3. Insert mensagem CSAT ← MENSAGEM VEM ANTES
4. Enviar WhatsApp ← ENVIA ANTES DE FECHAR
5. UPDATE conversations SET status = 'closed' ← FECHA POR ÚLTIMO
```

---

## Arquivo a Modificar

**`supabase/functions/auto-close-conversations/index.ts`**

### Antes (linhas 171-208)
```typescript
// 7. Fechar a conversa (ANTES do CSAT - ERRADO)
const updateData = { status: 'closed', ... };
await supabase.from('conversations').update(updateData)...

// 8. Enviar CSAT (DEPOIS de fechar - ERRADO)
if (dept.send_rating_on_close) {
  await supabase.from('messages').insert({ content: CSAT_MESSAGE })...
  if (conversation.channel === 'whatsapp') {
    await sendWhatsAppMessages(...)
  }
}
```

### Depois
```typescript
// 7. Enviar CSAT ANTES de fechar (se configurado)
if (dept.send_rating_on_close) {
  await supabase.from('messages').insert({ content: CSAT_MESSAGE })...
  
  // Enviar via WhatsApp se aplicável
  if (conversation.channel === 'whatsapp') {
    await sendWhatsAppMessages(supabase, conversation, INACTIVITY_CLOSE_MESSAGE, CSAT_MESSAGE);
  }
} else if (conversation.channel === 'whatsapp') {
  await sendWhatsAppMessages(supabase, conversation, INACTIVITY_CLOSE_MESSAGE, null);
}

// 8. AGORA fechar a conversa (DEPOIS do CSAT)
const updateData = { 
  status: 'closed',
  auto_closed: true,
  closed_at: new Date().toISOString(),
  closed_reason: 'inactivity',
  ai_mode: 'disabled',
  awaiting_rating: dept.send_rating_on_close,
  rating_sent_at: dept.send_rating_on_close ? new Date().toISOString() : null,
};
await supabase.from('conversations').update(updateData)...
```

---

## Validação do extractRating

A função já está correta:

```typescript
function extractRating(message: string): number | null {
  const normalized = message.trim();
  
  // ✅ Só aceita número direto: "1", "2", "3", "4", "5"
  const numMatch = normalized.match(/^[1-5]$/);
  if (numMatch) return parseInt(numMatch[0]);
  
  // ✅ Fallback visual: ⭐⭐⭐⭐⭐
  const starCount = (message.match(/⭐/g) || []).length;
  if (starCount >= 1 && starCount <= 5) return starCount;
  
  // ❌ Não interpreta texto (comportamento determinístico)
  return null;
}
```

---

## Checklist de Implementação

| Tarefa | Status |
|--------|--------|
| Campo `awaiting_rating` existe | ✅ Verificado |
| Função `extractRating` simplificada | ✅ Verificado |
| Corrigir ordem CSAT → close | ✅ Implementado |

---

## Resultado Esperado

1. Cliente recebe CSAT **antes** da conversa ser marcada como fechada
2. Sistema aguarda resposta (1-5) mesmo com conversa fechada
3. Captura determinística (sem IA interpretando texto)
