
# Plano: Corrigir Filtro "Não Respondidas" para Usar InboxItems Diretamente

## Problema Identificado

O filtro `not_responded` mostra badge "1" corretamente (contagem via edge function), mas a lista fica vazia porque:

1. A contagem (`myNotResponded`) vem da edge function `get-inbox-counts` que busca diretamente do banco
2. O filtro `filteredConversations` (linha 150-162) tenta cruzar `rawInboxItems` com `conversations`
3. Se a conversa não estiver no array `conversations` (por timing, cache ou qualquer outro motivo), o cruzamento falha

**Conversa Problema Encontrada:**
- ID: `054ac019-9ee4-444c-aa0f-f38a39202368`
- Contato: Ronildo Oliveira
- Assigned to: `697a5d4e-9637-4b85-b7a0-bd880151648b` (admin)
- Status: `open`
- last_sender_type: `contact` (aguardando resposta)

---

## Solucao

Aplicar a mesma abordagem usada para busca global: construir objetos `Conversation` diretamente de `rawInboxItems` quando filtro `not_responded` estiver ativo, sem depender do cruzamento com `conversations`.

---

## Mudanca Tecnica

### Arquivo: `src/pages/Inbox.tsx` (linhas 148-163)

Substituir o cruzamento simples por uma construcao completa de objetos:

```typescript
// ANTES (problemático)
if (filter === "not_responded") {
  const sourceInboxItems = rawInboxItems ?? inboxItems;
  const notRespondedIds = new Set(
    sourceInboxItems
      ?.filter(item => 
        item.last_sender_type === 'contact' && 
        item.assigned_to === user?.id &&
        item.status !== 'closed'
      )
      .map(item => item.conversation_id) || []
  );
  return conversations.filter(c => notRespondedIds.has(c.id));
}

// DEPOIS (robusto)
if (filter === "not_responded") {
  const sourceInboxItems = rawInboxItems ?? inboxItems;
  const notRespondedItems = sourceInboxItems?.filter(item => 
    item.last_sender_type === 'contact' && 
    item.assigned_to === user?.id &&
    item.status !== 'closed'
  ) || [];
  
  // Construir lista diretamente dos inboxItems (mesmo padrão da busca global)
  return notRespondedItems.map(item => {
    // Tentar encontrar a conversa completa
    const fullConv = conversations?.find(c => c.id === item.conversation_id);
    if (fullConv) return fullConv;
    
    // Se nao encontrou, criar objeto minimo para exibir na lista
    return {
      id: item.conversation_id,
      contact_id: item.contact_id,
      status: item.status,
      ai_mode: item.ai_mode,
      assigned_to: item.assigned_to,
      department: item.department,
      channel: item.last_channel,
      created_at: item.created_at,
      last_message_at: item.last_message_at,
      updated_at: item.updated_at,
      // ... demais campos com defaults
      contacts: {
        id: item.contact_id,
        first_name: item.contact_name?.split(' ')[0] || 'Contato',
        last_name: item.contact_name?.split(' ').slice(1).join(' ') || '',
        email: item.contact_email,
        phone: item.contact_phone,
        avatar_url: item.contact_avatar,
        organizations: null,
      } as Contact,
    } as Conversation;
  }).filter(Boolean);
}
```

---

## Fluxo Corrigido

```
Usuario clica em "Nao respondidas" (1)
          |
          v
+----------------------------------+
|  filter === "not_responded"      |
|                                  |
|  1. Filtrar rawInboxItems:       |
|     - last_sender_type='contact' |
|     - assigned_to = user.id      |
|     - status != 'closed'         |
|                                  |
|  2. Para cada item encontrado:   |
|     - Buscar em conversations    |
|     - Se nao encontrar: criar    |
|       objeto Conversation do     |
|       item                       |
|                                  |
|  3. Retornar lista construida    |
+----------------------------------+
          |
          v
   Lista mostra a conversa
   (Ronildo Oliveira)
```

---

## Arquivos Afetados

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Inbox.tsx` | Reconstruir logica do filtro not_responded usando inboxItems diretamente |

---

## Validacao Pos-Implementacao

1. Abrir Inbox
2. Clicar em "Nao respondidas" (mostra 1)
3. Conversa de "Ronildo Oliveira" deve aparecer na lista
4. Clicar na conversa - deve abrir normalmente
5. Enviar resposta - conversa deve sair do filtro automaticamente

---

## Conformidade com Regras

- **Upgrade, nao downgrade**: Melhora robustez sem quebrar funcionalidade
- **Zero regressao**: Outros filtros continuam funcionando normalmente
- **Preservacao do existente**: Mantem estrutura do useMemo, apenas melhora logica interna
- **Reutilizacao de padrao**: Mesma abordagem ja usada com sucesso na busca global
