

## Problema

O bug está na lógica de determinação do modo (linha 34). O `assignedMode` é **derivado** do valor de `fixedAssignedTo`:

```ts
const assignedMode = fixedAssignedTo !== undefined && fixedAssignedTo !== null ? 'fixed' : 'csv';
```

Quando o usuário clica em "Vendedor fixo", o `handleModeChange('fixed')` apenas limpa o mapping CSV — mas **não seta nenhum valor** em `fixedAssignedTo`. Como ele continua `null`, o modo calculado volta para `'csv'` imediatamente, impedindo a troca.

## Solução

Usar um **estado local** para controlar o modo selecionado, em vez de derivá-lo do valor de `fixedAssignedTo`.

### Alteração em `DealColumnMapper.tsx`
1. Adicionar `useState<AssignedMode>` inicializado com base no `fixedAssignedTo` prop (se não-nulo → `'fixed'`, senão → `'csv'`)
2. `handleModeChange` atualiza o state local + chama os callbacks existentes
3. Usar o state local no render em vez da derivação calculada

Isso é uma correção de ~5 linhas no mesmo arquivo.

