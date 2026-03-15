

# Exibir Produto e SKU abaixo do Número do Pedido

## Problema atual
1. A edge function fecha a conexão MySQL (`client.close()` linha 96) **antes** de consultar `mabang_order_item` (linha 109) — os produtos nunca são retornados.
2. O SKU (`stock_sku`) não está sendo buscado.
3. O bloco de produtos aparece acima do número do pedido, não abaixo.

## Mudanças

### 1. Edge Function `lookup-order-by-tracking/index.ts`
- Mover `client.close()` para **depois** da query de `mabang_order_item`
- Buscar `title` e `stock_sku` da `mabang_order_item`
- Retornar array de objetos `{ title, sku }` em vez de apenas `string[]`

### 2. `AdminReturnDialog.tsx`
- Atualizar interface `LookupResult` para incluir `product_items?: { title: string; sku: string }[]`
- Mover o bloco de produto/SKU para **abaixo** do campo "Número do Pedido"
- Exibir cada item como: `Produto: título` / `SKU: código`

Resultado visual:
```text
Número do Pedido *
[SABR-N-SHPE-9491-16173318]

  Produto: Nome do produto
  SKU: SAD13733

Rastreio Devolução
[...]
```

