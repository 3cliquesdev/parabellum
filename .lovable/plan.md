

# Fix: Calendário de período personalizado não permite selecionar datas

## Problema
O `DateRangePicker` (componente com presets) usa `Popover` **sem `modal={true}`**. Quando o usuário clica em um dia do calendário, o Radix interpreta como interação que causa perda de foco e dispara `onOpenChange(false)` **antes** do `onSelect` do Calendar — o popover fecha sem registrar a seleção.

O outro componente (`DatePickerWithRange` em `ui/date-range-picker.tsx`) já funciona corretamente porque usa `<Popover modal={true}>`.

## Auditoria — Todos os date range pickers

| Componente | Arquivo | Tem `modal` / proteção? | Status |
|---|---|---|---|
| `DatePickerWithRange` | `src/components/ui/date-range-picker.tsx` | ✅ `modal={true}` | OK |
| `DateRangePicker` | `src/components/DateRangePicker.tsx` | ❌ Sem `modal` nem `onInteractOutside` | **QUEBRADO** |

Todos os usos do `DateRangePicker` são afetados:
- `FiscalExport.tsx` (Nota Fiscal — caso reportado)
- `ConversationsReport.tsx`
- `CommercialConversationsReport.tsx`
- `Subscriptions.tsx`
- `GlobalFilters.tsx` (Analytics)

## Solução

Alteração única em `src/components/DateRangePicker.tsx`, linha 265:

Trocar:
```tsx
<Popover open={calendarOpen} onOpenChange={handleCalendarOpenChange}>
```
Por:
```tsx
<Popover open={calendarOpen} onOpenChange={handleCalendarOpenChange} modal={true}>
```

Isso impede que cliques dentro do popover causem fechamento prematuro, mantendo o comportamento de fechar programaticamente apenas quando ambas as datas forem selecionadas (lógica já existente em `handleCalendarSelect`).

Uma linha corrige todos os 5+ locais que usam este componente.

