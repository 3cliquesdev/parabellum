

# Fix: Erro "column conversation_id of relation interactions does not exist"

## Causa Raiz

O trigger `sync_consultant_to_open_conversations` (disparado no `UPDATE contacts SET consultant_id = ...`) tenta inserir na tabela `interactions` usando a coluna `conversation_id` — que **não existe**. A tabela usa `customer_id`, não `conversation_id`.

Quando a distribuição round-robin atualiza `contacts.consultant_id`, esse trigger dispara e falha.

## Correção

### Migration SQL — Recriar a função `sync_consultant_to_open_conversations`

Substituir `conversation_id` por `customer_id` e adicionar a coluna `channel` (obrigatória):

```sql
CREATE OR REPLACE FUNCTION public.sync_consultant_to_open_conversations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  updated_conv RECORD;
BEGIN
  FOR updated_conv IN
    UPDATE conversations
    SET assigned_to = NEW.consultant_id,
        ai_mode = 'copilot'
    WHERE contact_id = NEW.id
      AND status = 'open'
      AND assigned_to IS NULL
    RETURNING id
  LOOP
    INSERT INTO interactions (
      customer_id,
      type,
      content,
      channel,
      metadata,
      created_at
    ) VALUES (
      NEW.id,
      'note',
      'Conversa atribuída automaticamente ao consultor do contato (sync_consultant_trigger)',
      'other',
      jsonb_build_object(
        'trigger', 'sync_consultant_to_open_conversations',
        'consultant_id', NEW.consultant_id,
        'contact_id', NEW.id,
        'conversation_id', updated_conv.id
      ),
      now()
    );
  END LOOP;

  RETURN NEW;
END;
$function$;
```

Mudanças:
- `conversation_id` → `customer_id` (usando `NEW.id` que é o `contact_id`)
- Adicionada coluna `channel` = `'other'` (obrigatória)
- `conversation_id` preservado no `metadata` para referência

Zero regressão — o trigger continua fazendo o sync de conversas abertas, apenas o INSERT na `interactions` passa a usar as colunas corretas.

