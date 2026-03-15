

# Tornar Rastreio Reverso obrigatório apenas no formulário do Cliente

## Mudanças em `src/components/client-portal/NewReturnDialog.tsx`

1. **Label**: Trocar `"Código de Rastreio da Devolução (opcional)"` para `"Código de Rastreio da Devolução *"`
2. **Botão disabled**: Adicionar `!trackingReturn` à condição de desabilitado do botão de envio

Nenhuma alteração no `AdminReturnDialog.tsx` — lá o campo continua opcional.

