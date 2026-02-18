

## Corrigir Erro "Cannot coerce the result to a single JSON object" nas Macros

### Problema
O erro ocorre no hook `useUpdateCannedResponse` (linha 82 de `src/hooks/useCannedResponses.tsx`). O metodo `.single()` exige que exatamente 1 linha seja retornada apos o update. Se as politicas RLS impedem o retorno da linha atualizada (ou se ha qualquer inconsistencia), o Supabase retorna erro.

O mesmo problema pode ocorrer no `useCreateCannedResponse` (linha 56) que tambem usa `.single()`.

### Solucao
Substituir `.single()` por `.maybeSingle()` nos dois hooks afetados:

**Arquivo: `src/hooks/useCannedResponses.tsx`**

1. **`useCreateCannedResponse`** (linha 56): trocar `.single()` por `.maybeSingle()`
2. **`useUpdateCannedResponse`** (linha 82): trocar `.single()` por `.maybeSingle()`

### O que NAO muda
- Logica de CRUD permanece identica
- Pagina /settings/macros inalterada
- MacrosPopover no Inbox inalterado
- Fluxo de insercao de macros no chat inalterado
- Kill Switch, Shadow Mode, CSAT, distribuicao: nao afetados

