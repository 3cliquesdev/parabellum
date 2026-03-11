

# Diagnóstico: Filtro por tag sempre vazio

## Causa Raiz

O hook `useTagConversationIds` busca IDs de conversas com a tag selecionada:

```typescript
supabase.from('conversation_tags').select('conversation_id').in('tag_id', tags)
```

**Problema:** Sem `.limit()` explícito, o Supabase aplica o limite padrão de **1000 linhas**. A tag "Desistência da conversa" tem **4.180 registros** em `conversation_tags`. O Supabase retorna apenas 1000 IDs arbitrários. Depois, o `applyFilters` faz a interseção client-side com as 1000 conversas arquivadas carregadas — a sobreposição entre os dois conjuntos de 1000 é mínima ou zero.

Resultado: **filtro sempre vazio**, apesar de existirem milhares de conversas com essa tag.

## Solução

Mover o filtro de tags para o nível do banco de dados em `fetchInboxData`, eliminando a interseção client-side problemática.

### Arquivo: `src/hooks/useInboxView.tsx`

**1. Adicionar `tags` ao `FetchOptions`:**
Incluir `tags?: string[]` na interface.

**2. Em `fetchInboxData`, filtrar por tag no banco:**
Quando `tags` estiver presente, buscar os `conversation_id`s primeiro (com limite alto) e aplicar `.in()` na query principal:

```typescript
if (tags && tags.length > 0) {
  const { data: tagRows } = await supabase
    .from('conversation_tags')
    .select('conversation_id')
    .in('tag_id', tags);
  
  const tagConvIds = tagRows?.map(r => r.conversation_id) || [];
  
  if (tagConvIds.length === 0) {
    return []; // Nenhuma conversa com essa tag — retorno vazio imediato
  }
  
  // Supabase .in() suporta até ~2000 IDs; para mais, fazer em chunks
  query = query.in('conversation_id', tagConvIds.slice(0, 2000));
}
```

**3. Passar `tags` no `fetchOptions`:**
No `useMemo` de `fetchOptions`, incluir `tags: filters?.tags`.

**4. Remover filtro client-side de tags do `applyFilters`:**
Remover o bloco:
```typescript
if (filters.tags && filters.tags.length > 0 && tagIdsSet) {
  result = result.filter(item => tagIdsSet.has(item.conversation_id));
}
```

**5. Remover `useTagConversationIds`:**
A função e sua chamada em `useInboxView` não são mais necessárias.

**6. Atualizar `queryKey`:**
Adicionar `filters?.tags?.join(',')` ao queryKey para invalidar o cache ao mudar tags.

### Impacto
- 1 arquivo editado (`useInboxView.tsx`)
- Elimina o problema do limite de 1000 do Supabase
- Tags filtradas no banco = resultados corretos independente do volume de dados
- Funciona para active e archived scope

