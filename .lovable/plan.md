

# Adicionar upload de fotos na solicitação de devolução

## O que será feito

Permitir que o cliente anexe até 5 fotos do produto ao solicitar uma devolução no portal. As imagens serão enviadas via edge function (sem depender de auth do cliente no storage) e as URLs salvas em uma coluna JSONB na tabela `returns`.

## Alterações

### 1. Migração — adicionar coluna `photos` na tabela `returns`
```sql
ALTER TABLE public.returns ADD COLUMN photos jsonb DEFAULT '[]'::jsonb;
```

### 2. Edge function `upload-return-photo/index.ts` (nova)
- Recebe `FormData` com um arquivo de imagem
- Valida tipo (jpeg, png, webp) e tamanho (max 5MB)
- Faz upload para bucket `return-photos` (criar bucket público via migração)
- Retorna a URL pública
- `verify_jwt = false` (mesmo padrão do `register-return`)

### 3. Migração — criar bucket `return-photos`
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('return-photos', 'return-photos', true);
-- RLS: permitir upload via service_role (edge function), leitura pública
```

### 4. Atualizar `NewReturnDialog.tsx`
- Adicionar state `photos: string[]` para armazenar URLs das fotos já enviadas
- Componente de upload inline: área de drop/click que chama a edge function `upload-return-photo`
- Preview das fotos com botão de remover (grid 3 colunas)
- Limite visual: "até 5 fotos, máx 5MB cada"
- Passar `photos` no body do `registerReturn.mutateAsync`

### 5. Atualizar `register-return/index.ts`
- Aceitar campo `photos` (array de strings) no body
- Validar: array com no máximo 5 URLs, cada uma string válida
- Incluir `photos` no insert da tabela `returns`

### 6. Atualizar `useClientReturns.ts`
- Adicionar `photos?: string[]` ao tipo `RegisterReturnData`

## Fluxo
```text
Cliente seleciona foto → upload-return-photo (edge fn) → bucket return-photos → URL retornada
Cliente submete form → register-return recebe photos[] → salva na coluna JSONB
```

