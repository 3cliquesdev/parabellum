
## Correcao Critica: Mensagens dos agentes nao chegam aos clientes via WhatsApp

### Causa Raiz

A funcao `inboxItemToConversation` no arquivo `src/pages/Inbox.tsx` (linhas 151-236) converte itens do `inbox_view` em objetos `Conversation` para uso no `ChatWindow` e `SuperComposer`. Porem, tres campos criticos estao **hardcoded como `null`**:

```
whatsapp_instance_id: null,      // linha 184
whatsapp_meta_instance_id: null,  // linha 185
whatsapp_provider: null,          // linha 186
```

Alem disso, `contacts.whatsapp_id` tambem esta `null` (linha 232).

### Consequencia

O `SuperComposer` recebe essas props como `null`, entao a condicao que detecta WhatsApp Meta nunca e verdadeira:

```typescript
// SuperComposer linha 355 - NUNCA entra aqui
else if (whatsappProvider === 'meta' && whatsappMetaInstanceId && contactPhone) {
```

O codigo cai no fallback `web_chat` (linha 496), que salva a mensagem no banco com `channel: web_chat` e `provider_message_id: NULL` — **nunca enviando a mensagem via WhatsApp**.

### Evidencia no Banco

Todas as 12 mensagens recentes da Fernanda Giglio mostram:
- `channel: web_chat` (deveria ser `whatsapp`)
- `provider_message_id: NULL` (nunca enviada)
- `status: NULL` (sem confirmacao de entrega)
- As conversas correspondentes TEM `whatsapp_provider: meta` e `whatsapp_meta_instance_id` corretos

### Solucao

Duas correcoes complementares:

**Correcao 1 - Adicionar colunas ao `inbox_view`** (migracao SQL)

A view `inbox_view` nao possui as colunas `whatsapp_instance_id`, `whatsapp_meta_instance_id` e `whatsapp_provider`. Precisamos atualiza-la para incluir esses campos da tabela `conversations`.

**Correcao 2 - Mapear os campos em `inboxItemToConversation`** (Inbox.tsx)

Alterar a funcao para ler os novos campos do `inbox_view` em vez de hardcodar `null`:

```typescript
whatsapp_instance_id: item.whatsapp_instance_id || null,
whatsapp_meta_instance_id: item.whatsapp_meta_instance_id || null,
whatsapp_provider: item.whatsapp_provider || null,
```

E no contato:
```typescript
whatsapp_id: item.contact_whatsapp_id || item.contact_phone || null,
```

**Correcao 3 - Atualizar o tipo `InboxViewItem`** (useInboxView.tsx)

Adicionar os novos campos na interface:

```typescript
whatsapp_instance_id: string | null;
whatsapp_meta_instance_id: string | null;
whatsapp_provider: string | null;
contact_whatsapp_id: string | null;
```

### Secao Tecnica

Arquivos alterados:

1. **Migracao SQL** - Recriar ou alterar a view `inbox_view` para incluir `whatsapp_instance_id`, `whatsapp_meta_instance_id`, `whatsapp_provider` da tabela `conversations`, e `whatsapp_id` do contato como `contact_whatsapp_id`

2. **`src/hooks/useInboxView.tsx`** - Adicionar 4 campos novos na interface `InboxViewItem`

3. **`src/pages/Inbox.tsx`** - Mapear os campos na funcao `inboxItemToConversation` (linhas 183-186 e 232)

### Impacto

- **Zero regressao**: nenhuma feature existente e alterada
- **Corrige imediatamente**: todas as mensagens de agentes passarao a ser enviadas via WhatsApp quando a conversa for WhatsApp
- **Escopo cirurgico**: apenas 3 arquivos alterados + 1 migracao SQL
- **Gravidade**: CRITICA - agentes estao trabalhando mas clientes nao recebem respostas
