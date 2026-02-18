

## Correções: Multi-valor, Display e Build Error

### 1. Corrigir erro de build "mux-embed"

O `bun.lock` contém uma referência corrompida a `mux-embed` (dependência de `@mux/mux-player` que não está no `package.json`). A solução é deletar o `bun.lock` para que seja regenerado limpo.

- Arquivo: `bun.lock` -- deletar o arquivo para regeneração automática

### 2. Corrigir display do nó de Condição

Atualmente o nó mostra "(X termos)" para QUALQUER tipo de condição quando o valor tem vírgula. Isso é enganoso para "É igual a", que não suporta multi-valor. O display de termos deve aparecer APENAS quando o tipo é "contains".

- Arquivo: `src/components/chat-flows/nodes/ConditionNode.tsx`
- Alteração: Verificar `condition_type` antes de fazer split por vírgula. Só mostrar contagem de termos quando tipo for "contains".

### 3. Suportar multi-valor também para "É igual a" (equals)

Para dar mais flexibilidade, o tipo "equals" também passará a suportar múltiplos valores separados por vírgula com lógica OR (se o valor é igual a qualquer um dos termos).

- Arquivo: `supabase/functions/process-chat-flow/index.ts`
- Na função `evaluateCondition`, o case "equals" fará split por vírgula e verificará se o campo é igual a qualquer um dos valores.
- Arquivo: `src/components/chat-flows/ChatFlowEditor.tsx`
- Trocar Input por Textarea também para tipo "equals" com o mesmo hint.
- Arquivo: `src/components/chat-flows/nodes/ConditionNode.tsx`
- Permitir display de termos para "contains" e "equals".

### Seção Técnica

| Arquivo | Alteração |
|---------|-----------|
| `bun.lock` | Deletar para regeneração |
| `src/components/chat-flows/nodes/ConditionNode.tsx` | Mostrar "(X termos)" para contains e equals apenas |
| `src/components/chat-flows/ChatFlowEditor.tsx` (~linha 634) | Textarea para "contains" e "equals" |
| `supabase/functions/process-chat-flow/index.ts` (~linha 151-152) | Split por vírgula no case "equals" com lógica OR |

### O que NÃO muda
- Outros tipos de condição (has_data, regex, etc.) não são afetados
- Fluxos existentes continuam compatíveis (valor único = array de 1)
- Kill Switch, Shadow Mode, CSAT, distribuição: inalterados
- Encadear condições (Condição → Não → outra Condição) continua sendo a forma recomendada para rotas diferentes

