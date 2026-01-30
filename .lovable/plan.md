
# Plano: Corrigir Filtro "Não Respondidas" para Ignorar Outros Filtros

## Problema Identificado

O filtro "Não respondidas" mostra contagem correta (1), mas a lista aparece vazia porque:

1. O `result` usado no filtro já foi pré-filtrado por outros critérios (busca, filtros do popover)
2. A lógica de busca ativa retorna cedo (linha 156), nunca alcançando o `case "not_responded"`
3. O cruzamento entre `conversations` filtrado e `notRespondedIds` resulta em conjunto vazio

## Solução

Reestruturar a lógica do filtro `not_responded` para usar uma abordagem **direta**, ignorando filtros prévios.

---

## Mudanças Técnicas

### Arquivo: `src/pages/Inbox.tsx`

#### Mudança 1: Mover lógica do `not_responded` ANTES do early return de busca

O filtro `not_responded` deve ser processado antes de qualquer outro filtro ser aplicado:

```typescript
// Linhas 145-214 - Reestruturar filteredConversations

const filteredConversations = useMemo(() => {
  if (!conversations) return [];
  
  // 🔒 FILTRO ESPECIAL: not_responded - IGNORAR outros filtros
  // Deve retornar TODAS as conversas do agente aguardando resposta
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
    // Filtrar diretamente de conversations (sem outros filtros)
    return conversations.filter(c => notRespondedIds.has(c.id));
  }
  
  let result = conversations;

  // ... resto da lógica existente (busca, departamento, outros filtros)
```

#### Mudança 2: Remover o `case "not_responded"` duplicado do switch

Após mover a lógica para cima, remover o case antigo:

```typescript
// Remover linhas 189-203 (o case antigo)
case "not_responded":
  // Deletar este bloco inteiro
```

---

## Fluxo Corrigido

```
┌─────────────────────────────────────────────────────────────┐
│  Usuário clica em "Não respondidas"                         │
│  (filter = "not_responded")                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. filteredConversations detecta filter === "not_responded"│
│  2. Busca rawInboxItems (sem filtros de popover)            │
│  3. Filtra por: last_sender_type='contact' + assigned_to=me │
│  4. Retorna conversas DIRETAMENTE, ignorando:               │
│     ❌ Filtro de busca                                       │
│     ❌ Filtro de departamento                                │
│     ❌ Filtros do popover (áudio, anexos, etc.)              │
│                                                              │
│  ✅ Lista mostra conversa não respondida                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `src/pages/Inbox.tsx` | Mover lógica not_responded para início do useMemo |

---

## Validação Pós-Implementação

1. Abrir Inbox
2. Clicar em "Não respondidas" (mostra 1)
3. Conversa deve aparecer na lista
4. Aplicar filtro de busca com outro termo
5. Voltar para "Não respondidas"
6. Conversa ainda deve aparecer (ignorando busca)

---

## Conformidade com Regras

- **Upgrade, não downgrade**: Melhora precisão do filtro sem quebrar outros
- **Zero regressão**: Outros filtros continuam funcionando normalmente
- **Preservação do existente**: Lógica original mantida para demais filtros
