

# Fix: Crash na /organizations ao clicar em Editar

## Problema

O `<SelectItem value="">` na linha 136 do `OrganizationDialog.tsx` causa crash. O Radix UI Select **nao aceita string vazia como value** -- lanca excecao que e capturada pelo error boundary, mostrando "Algo deu errado".

## Solucao

Trocar `value=""` por um valor sentinel (ex: `"none"`) e tratar no submit/reset:

1. **`OrganizationDialog.tsx`**:
   - `<SelectItem value="none">Nenhum</SelectItem>` (linha 136)
   - `defaultValues.default_department_id`: usar `"none"` quando vazio
   - `useEffect reset`: usar `"none"` quando vazio
   - `onSubmit`: converter `"none"` de volta para `null`

## Arquivo unico

`src/components/OrganizationDialog.tsx` -- 4 pontos de mudanca, todos no mesmo arquivo.

