

# Plano: Tag Configurável para Atendimento Fora do Horário

## Problema Atual

A tag `pendente_retorno` está **hardcoded** no backend (`ai-autopilot-chat`, L8457). Não existe forma de escolher qual tag aplicar quando a IA transfere fora do horário comercial.

## Solução

Adicionar um campo `after_hours_tag_id` na tabela `business_messages_config` (na linha do `after_hours_handoff`) e um seletor de tag na UI da página SLA.

## Alterações

### 1. Migração — Adicionar coluna `metadata` à `business_messages_config`

```sql
ALTER TABLE public.business_messages_config 
  ADD COLUMN IF NOT EXISTS after_hours_tag_id uuid REFERENCES public.tags(id) ON DELETE SET NULL;
```

Coluna opcional na row `after_hours_handoff` para guardar o ID da tag selecionada.

### 2. Frontend — `src/pages/SLASettings.tsx` (`BusinessMessagesSection`)

- Na seção da mensagem `after_hours_handoff`, adicionar um **Select** com todas as tags disponíveis (via `useTags()`).
- Label: **"Tag aplicada ao encerrar fora do horário"**
- Valor atual vindo de `business_messages_config.after_hours_tag_id`
- Opção "Nenhuma" para não aplicar tag
- Salvar junto com o botão existente

### 3. Backend — `supabase/functions/ai-autopilot-chat/index.ts` (~L8452-8474)

Substituir a busca hardcoded por `pendente_retorno`:

**Antes:**
```ts
const { data: tagRow } = await supabaseClient
  .from('tags').select('id')
  .eq('name', 'pendente_retorno').maybeSingle();
```

**Depois:**
```ts
// 1. Buscar tag configurada
const { data: configRow } = await supabaseClient
  .from('business_messages_config')
  .select('after_hours_tag_id')
  .eq('message_key', 'after_hours_handoff')
  .maybeSingle();

const tagId = configRow?.after_hours_tag_id;
// Se configurado, aplicar; se não, fallback para 'pendente_retorno'
```

### 4. Hook — `src/hooks/useBusinessMessages.ts`

Atualizar a mutation para também salvar `after_hours_tag_id` quando fornecido.

