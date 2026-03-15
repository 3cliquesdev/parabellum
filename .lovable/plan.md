

# Reorganizar campos do formulário de devolução

## Mudanças

### `NewReturnDialog.tsx`

1. **Rastreio de envio** — Transformar o resultado da busca automática em um campo rotulado "Rastreio de Envio do Pedido", exibido como input read-only quando encontrado, ou mensagem "não localizado" quando não. Manter o lookup automático no `onBlur` do número do pedido.

2. **Descrição obrigatória** — Remover "(opcional)" do label, adicionar validação no `disabled` do botão submit (`!description`).

3. **Ordem dos campos**:
   - Número do Pedido
   - Rastreio de Envio do Pedido (auto-preenchido, read-only)
   - Código de Rastreio da Devolução (opcional)
   - Motivo
   - Descrição (obrigatória)
   - Fotos (opcional)

4. **Validação submit** — Adicionar `!description` à condição de `disabled` do botão.

