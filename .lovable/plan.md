

# Fix: Date Picker no Dialog de Exportação

## Problema
O `DatePickerWithRange` usa um `Popover` que, quando renderizado dentro de um `Dialog`, fica bloqueado ou atrás do overlay do dialog — o calendário não aparece ou não é clicável.

## Solução

### `src/components/ui/date-range-picker.tsx`
- Adicionar `modal={true}` no `Popover` para que ele renderize acima do dialog
- Garantir `z-50` no `PopoverContent` para ficar acima do overlay do dialog

### `src/components/email/EmailSendsExportDialog.tsx`  
- Nenhuma alteração necessária — o fix é no componente do date picker

## Impacto
- Zero regressão: o `modal={true}` no Popover melhora o comportamento em todos os contextos (dentro ou fora de dialogs)

