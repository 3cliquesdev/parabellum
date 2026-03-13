

## Plano: Iniciar Conversa no Inbox a partir do Deal no Pipeline

### Problema
O botão de WhatsApp no KanbanCard abre o `wa.me` externo. Não há como iniciar uma conversa **dentro do sistema** (Inbox) diretamente do card do deal no pipeline.

### Solução
Adicionar um botão "Iniciar Conversa" no KanbanCard que:
1. Verifica se já existe uma conversa aberta para o contato do deal
2. Se sim, navega direto para ela no inbox
3. Se não, cria uma nova conversa usando `useCreateConversation` e navega para o inbox

### Mudanças

**1. `src/components/KanbanCard.tsx`**
- Importar `useCreateConversation` de `@/hooks/useConversations`
- Importar ícone `Inbox` do lucide-react
- Adicionar botão "Iniciar Conversa no Inbox" na seção de Quick Actions (ao lado dos botões existentes de WhatsApp/Phone)
- Lógica do onClick:
  - Se `deal.contact_id` não existe → toast de erro ("Deal sem contato vinculado")
  - Buscar conversa aberta existente: `supabase.from("conversations").select("id").eq("contact_id", deal.contact_id).eq("status", "open").limit(1)`
  - Se encontrar → `navigate(/inbox?conversation=${id})`
  - Se não encontrar → `createConversation.mutateAsync(deal.contact_id)` → navegar para a conversa criada
- Botão visível para **todos os deals que têm `contact_id`** (não apenas os com telefone)

### Resultado
Vendedor clica no botão do card → conversa aparece no Inbox → pode atender sem sair do fluxo de vendas.

