

# Fix: Textarea "Palavras de saída" não permite scroll/expandir

## Problema
O `Textarea` de palavras de saída tem `rows={3}` e `className="resize-none"`, impedindo o usuário de ver ou adicionar mais palavras quando ultrapassa 3 linhas.

## Solução

### `src/components/chat-flows/panels/BehaviorControlsSection.tsx` (linha 183-184)
- Mudar `rows={3}` para `rows={4}` (mais espaço inicial)
- Trocar `resize-none` por `resize-y` para permitir redimensionar verticalmente
- Adicionar `min-h-[80px] max-h-[200px] overflow-y-auto` para garantir scroll quando necessário

Mudança única, zero regressão — apenas CSS no textarea.

