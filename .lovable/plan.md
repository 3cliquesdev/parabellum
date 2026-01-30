
# Plano: Corrigir Busca do Inbox e Badge de Filtros

## Problemas Identificados

### Problema 1: Busca não retorna resultados
A busca mostra "0 conversas" ou lista vazia porque:

1. O `useInboxView` retorna IDs de conversas que correspondem à busca
2. O `Inbox.tsx` cruza esses IDs com a lista de `conversations` (linha 170-171)
3. **Se a conversa está em outro departamento ou atribuída a outro agente**, ela não está na lista de `conversations` do usuário atual

**Para admin/manager**: A busca deveria encontrar QUALQUER conversa, mas os filtros de role estão interferindo.

### Problema 2: Badge "Filtros: 1" aparece ao digitar
O campo de busca é contado como filtro ativo (linha 88 do InboxFilterPopover), criando badge confuso.

---

## Solução

### Mudança 1: Não contar busca como "filtro" no badge

**Arquivo**: `src/components/inbox/InboxFilterPopover.tsx`

Remover `filters.search ? 1 : 0` da contagem de filtros ativos para que a busca não apareça como "Filtros: 1".

```typescript
// ANTES (linhas 82-94)
const activeFiltersCount = [
  filters.dateRange?.from ? 1 : 0,
  filters.channels.length,
  filters.status.length,
  filters.assignedTo ? 1 : 0,
  filters.tags.length,
  filters.search ? 1 : 0,  // ← REMOVER ESTA LINHA
  filters.slaExpired ? 1 : 0,
  ...
].reduce((a, b) => a + b, 0);

// DEPOIS
const activeFiltersCount = [
  filters.dateRange?.from ? 1 : 0,
  filters.channels.length,
  filters.status.length,
  filters.assignedTo ? 1 : 0,
  filters.tags.length,
  // search NÃO é contado como filtro - é campo de busca separado
  filters.slaExpired ? 1 : 0,
  ...
].reduce((a, b) => a + b, 0);
```

### Mudança 2: Permitir busca global ignorando filtros de role/status

**Arquivo**: `src/pages/Inbox.tsx`

Quando há busca ativa, permitir que TODAS as conversas do `inboxItems` sejam exibidas, não apenas as que cruzam com `conversations`.

```typescript
// ANTES (linhas 169-174)
const hasActiveSearch = filters.search && filters.search.trim().length > 0;
if (hasActiveSearch && inboxItems) {
  result = result.filter(c => inboxItemIds.has(c.id));
  return result;
}

// DEPOIS - Construir lista diretamente de inboxItems quando buscando
if (hasActiveSearch && inboxItems) {
  // Para busca, usar inboxItems diretamente (que já passou pelo filtro de busca)
  // Cruzar com conversations apenas para enriquecer com dados completos
  const searchResults = inboxItems
    .map(item => {
      // Tentar encontrar a conversa completa
      const fullConv = conversations?.find(c => c.id === item.conversation_id);
      if (fullConv) return fullConv;
      
      // Se não encontrou (ex: outro departamento), criar objeto mínimo
      // para exibir na lista
      return {
        id: item.conversation_id,
        contact_id: item.contact_id,
        status: item.status as any,
        ai_mode: item.ai_mode,
        assigned_to: item.assigned_to,
        department: item.department,
        channel: item.last_channel as any,
        created_at: item.created_at,
        last_message_at: item.last_message_at,
        updated_at: item.updated_at,
        contacts: {
          id: item.contact_id,
          first_name: item.contact_name?.split(' ')[0] || 'Contato',
          last_name: item.contact_name?.split(' ').slice(1).join(' ') || '',
          email: item.contact_email,
          phone: item.contact_phone,
          avatar_url: item.contact_avatar,
          organizations: null,
        } as any,
      } as Conversation;
    })
    .filter(Boolean);
  
  return searchResults;
}
```

---

## Fluxo Corrigido

```
┌─────────────────────────────────────────────────────────────┐
│  Usuário digita "fabiosou1542@gmail.com"                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. useInboxView busca no inbox_view:                       │
│     - Inclui TODAS conversas (abertas + fechadas)           │
│     - Filtra por contact_email contendo o termo             │
│     - Retorna IDs das conversas encontradas                 │
│                                                              │
│  2. filteredConversations (NOVO comportamento):             │
│     - Detecta hasActiveSearch = true                         │
│     - Usa inboxItems diretamente (não cruza com role)       │
│     - Constrói objetos Conversation com dados do inboxItem  │
│                                                              │
│  3. Badge de Filtros:                                        │
│     - Busca NÃO conta como filtro                           │
│     - Badge só aparece para filtros reais (data, status)    │
│                                                              │
│  ✅ Conversa aparece na lista                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `src/components/inbox/InboxFilterPopover.tsx` | Remover `search` da contagem de filtros |
| `src/pages/Inbox.tsx` | Usar `inboxItems` diretamente na busca |

---

## Validação Pós-Implementação

1. Abrir Inbox
2. Digitar email "fabiosou1542@gmail.com"
3. Conversa deve aparecer na lista (mesmo se fechada ou de outro dept)
4. Badge "Filtros" NÃO deve aparecer ao digitar busca
5. Limpar busca → lista volta ao normal
6. Aplicar filtro real (ex: SLA) → Badge "Filtros: 1" aparece

---

## Conformidade com Regras

- **Upgrade, não downgrade**: Melhora UX sem quebrar funcionalidade
- **Zero regressão**: Busca que funcionava continua funcionando
- **Preservação do existente**: Filtros reais mantêm comportamento
