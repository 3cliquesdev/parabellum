

# Reordenar campos: Rastreio primeiro no formulário do cliente

O campo "Número do Pedido" está aparecendo antes do "Rastreio de Envio do Pedido", mas o rastreio deveria ser o primeiro campo.

## Mudança

### `src/components/client-portal/NewReturnDialog.tsx`

Inverter a ordem dos dois primeiros campos no formulário:

1. **Rastreio de Envio do Pedido** — campo editável onde o cliente digita/cola o rastreio. No `onBlur`, buscar o pedido correspondente.
2. **Número do Pedido** — auto-preenchido (read-only) quando encontrado via rastreio, ou "Não localizado" + input manual como fallback.

A lógica de lookup será adaptada: em vez de buscar tracking pelo order ID, buscará o order ID pelo tracking (usando a edge function `lookup-order-by-tracking` que já existe e consulta o MySQL externo).

