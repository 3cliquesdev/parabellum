

# Exibir Seller, Produto e SKU no formulário do Cliente

## Problema
O `NewReturnDialog` (cliente) chama a edge function `lookup-order-by-tracking` mas ignora os campos `buyer_name` e `product_items` retornados. O admin já exibe esses dados.

## Mudanças

### `src/components/client-portal/NewReturnDialog.tsx`

1. **Armazenar dados do lookup** — adicionar estado para `buyerName` e `productItems`:
   ```ts
   const [buyerName, setBuyerName] = useState<string | null>(null);
   const [productItems, setProductItems] = useState<{ title: string; sku: string }[]>([]);
   ```

2. **Capturar no callback `lookupOrderByTracking`** — ao receber resposta, salvar `data.buyer_name` e `data.product_items`.

3. **Limpar no reset** — zerar `buyerName` e `productItems` no `resetForm` e ao editar o campo de rastreio.

4. **Exibir bloco informativo abaixo do "Número do Pedido"** — mesmo padrão visual do admin (bloco `bg-muted/50 rounded-md p-3`):
   - **Seller**: nome do comprador
   - **Produto**: título de cada item
   - **SKU**: código de cada item

