

# Adicionar upload de fotos no AdminReturnDialog

## Contexto
O formulário de devolução do cliente (`NewReturnDialog`) já possui upload de fotos (até 5, via edge function `upload-return-photo`). O formulário admin (`AdminReturnDialog`) não tem essa funcionalidade. Vamos replicar o mesmo padrão.

## Mudanças

### 1. `src/components/support/AdminReturnDialog.tsx`
- Adicionar estados: `photos: string[]`, `uploading: boolean`, `fileInputRef`
- Copiar lógica de upload do `NewReturnDialog`: `handleUploadPhoto`, `handleFileChange`, `handleRemovePhoto` (usa `upload-return-photo` edge function)
- Adicionar seção de fotos no formulário (antes do botão Cadastrar): grid de previews com botão remover + zona de drop/click para adicionar
- Limpar `photos` no `resetForm`

### 2. `src/hooks/useReturns.ts`
- Adicionar campo `photos?: string[]` no tipo do `mutationFn` de `useCreateAdminReturn`
- Passar `photos` no insert: `photos: data.photos || null`

### 3. UI do upload (dentro do dialog)
Bloco idêntico ao do `NewReturnDialog`:
- Label "Fotos do produto (opcional)"
- Grid 3 colunas com previews + botão X para remover
- Zona dashed para adicionar mais fotos (até 5)
- Input file hidden (JPEG, PNG, WebP, máx 5MB)
- Indicador de loading durante upload

