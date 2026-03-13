

## Plano: Vincular Deal à Conversa criada pelo Pipeline

### Problema Atual
A tabela `conversations` não tem coluna `deal_id`. Quando o vendedor inicia conversa pelo pipeline, não há vínculo direto com o deal. Não é possível dar ganho/perdido a partir do inbox.

### Mudanças

**1. Migration: adicionar `deal_id` na tabela `conversations`**
```sql
ALTER TABLE public.conversations
ADD COLUMN deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL;

CREATE INDEX idx_conversations_deal_id ON public.conversations(deal_id);
```

**2. `src/components/pipeline/PipelineTemplateDialog.tsx`**
- Receber nova prop `dealId: string`
- Ao criar a conversa, incluir `deal_id: dealId` no insert

**3. `src/components/KanbanCard.tsx`**
- Passar `dealId={deal.id}` para o `PipelineTemplateDialog`

**4. UI no Inbox: Painel de Deal vinculado**
- No componente de conversa ativa no Inbox (header ou sidebar), se `conversation.deal_id` existir:
  - Mostrar badge com título do deal, valor e stage atual
  - Botões "Marcar como Ganho" e "Marcar como Perdido"
  - "Ganho" → abre validação de venda existente (canal, order_id se necessário)
  - "Perdido" → abre `LostReasonDialog` já existente
  - Após ação, atualizar o deal e mostrar feedback

### Resultado
Vendedor inicia conversa pelo pipeline → deal fica vinculado → pode fechar o deal (ganho/perdido) diretamente do inbox sem voltar ao pipeline.

