

# Fix: Filtro de Tag "Desistência da conversa" retorna 400 Bad Request

## Problema
A tag "9.04 Desistência da conversa" tem muitas conversas associadas (200+). Quando essas IDs são passadas via `.in('conversation_id', tagConvIds)` na query do `inbox_view`, a URL GET resultante excede o limite de tamanho do PostgREST, causando **400 Bad Request** (visível nos network requests).

O código atual em `src/hooks/useInboxView.tsx` (linha 148) faz:
```ts
query = query.in('conversation_id', tagConvIds.slice(0, 2000));
```
Mesmo com slice de 2000, UUIDs de 36 chars cada geram URLs de ~72KB, muito acima do limite.

## Solução
Criar uma **RPC function** no banco que faz o JOIN entre `inbox_view` e `conversation_tags` server-side, eliminando a necessidade de passar IDs na URL.

Alternativamente (mais simples e sem migration): **chunkar as queries em lotes de 300 IDs**, executar em paralelo, e mergear os resultados.

### Abordagem escolhida: Chunking client-side

**Arquivo:** `src/hooks/useInboxView.tsx` (linhas 132-148)

1. Quando `tagConvIds.length > 300`, dividir em chunks de 300
2. Executar a query base (sem `.in()`) clonada para cada chunk em paralelo
3. Mergear os resultados removendo duplicatas por `conversation_id`
4. Se `tagConvIds.length <= 300`, manter o comportamento atual (single query)

### Mudanças:
- Extrair a construção da query base para antes do filtro de tags
- Adicionar função helper `chunkedInQuery` que:
  - Divide IDs em chunks de 300
  - Executa queries paralelas com `Promise.all`
  - Faz dedup por `conversation_id`
- Aplicar o chunking no ponto onde `.in()` é usado (linha 148)

### Resultado
Tags com qualquer quantidade de conversas funcionarão sem 400 Bad Request. Performance mantida via execução paralela dos chunks.

