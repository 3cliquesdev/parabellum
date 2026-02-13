
# Regras de Encerramento de Conversas (Chat) — Tags Obrigatorias + Registro de Metricas

## Resumo

Implementar bloqueio de encerramento de conversa sem tags (similar ao que ja existe em tickets) com configuracao global, e enriquecer o registro de fechamento com dados completos para analise.

## Parte 1: Configuracao Global — Tags Obrigatorias em Conversas

### 1.1 Migration SQL — Seed da configuracao

Inserir nova configuracao `conversation_tags_required` na tabela `system_configurations`:

```sql
INSERT INTO system_configurations (key, value, category, description)
VALUES ('conversation_tags_required', 'false', 'inbox', 
        'Tags obrigatorias ao encerrar conversas de chat')
ON CONFLICT (key) DO NOTHING;
```

### 1.2 Hook para ler a configuracao

**Novo arquivo: `src/hooks/useConversationCloseSettings.tsx`**

Hook simples que le a configuracao `conversation_tags_required` de `system_configurations`:

```typescript
export function useConversationCloseSettings() {
  // Query para buscar valor de 'conversation_tags_required'
  // Retorna: { tagsRequired: boolean, isLoading: boolean }
}
```

## Parte 2: Bloqueio no CloseConversationDialog

### 2.1 Modificar `src/components/CloseConversationDialog.tsx`

Adicionar validacao de tags antes de permitir o encerramento:

1. Importar `useConversationCloseSettings` e `useConversationTags` (do `useTags.tsx`)
2. Verificar se `tagsRequired === true` e se a conversa tem zero tags
3. Se faltam tags:
   - Desabilitar botao "Encerrar Conversa"
   - Exibir alerta vermelho dentro do dialog com mensagem clara
   - Botao "Adicionar Tags" que fecha o dialog (usuario adiciona tags no header do chat e reabre)

**Fluxo visual dentro do dialog existente:**

```
+----------------------------------------------+
| [x] Encerrar Conversa                        |
|                                               |
| Voce esta encerrando a conversa com Joao...   |
|                                               |
| +------------------------------------------+ |
| | [!] TAGS OBRIGATORIAS                     | |
| | Adicione pelo menos uma tag antes de      | |
| | encerrar esta conversa.                   | |
| | Tags ajudam na classificacao e analise.   | |
| |                                           | |
| | [Adicionar Tags]                          | |
| +------------------------------------------+ |
|                                               |
| [ ] Enviar pesquisa de satisfacao             |
|                                               |
|          [Cancelar]  [Encerrar] (desabilitado)|
+----------------------------------------------+
```

Quando o usuario adiciona tags (via ConversationTagsSection no header do chat), o dialog atualiza automaticamente via react-query e libera o botao.

## Parte 3: Registro Completo de Metricas no Fechamento

### 3.1 Enriquecer Edge Function `close-conversation/index.ts`

Adicionar registro de eventos adicionais no fechamento:

1. **Motivo do encerramento**: Registrar se foi resolvido, transferido, abandonado
2. **Contagem de mensagens**: Total de mensagens na conversa
3. **Dados do contato**: Segmentacao e tipo de cliente
4. **Classificacao por tags**: Categorizar o atendimento

Adicionar ao objeto `metadata` da timeline entry:

```typescript
metadata: {
  conversation_id: conversationId,
  closed_by: userId,
  duration_minutes: durationMinutes,
  tags: tagNames,
  message_count: messageCount,        // NOVO
  agent_messages: agentMessageCount,   // NOVO
  customer_messages: customerMsgCount, // NOVO
  channel: conversation.channel,       // NOVO
  had_ai_assistance: hasCopilot,       // NOVO
  auto_generated: true,
}
```

### 3.2 Contagem de mensagens (dentro do edge function)

Antes de fechar, fazer um COUNT das mensagens:

```typescript
const { count: messageCount } = await supabase
  .from("messages")
  .select("*", { count: "exact", head: true })
  .eq("conversation_id", conversationId);

const { count: agentMessageCount } = await supabase
  .from("messages")
  .select("*", { count: "exact", head: true })
  .eq("conversation_id", conversationId)
  .eq("sender_type", "agent");
```

## Parte 4: Toggle de Configuracao na UI Admin

### 4.1 Adicionar toggle na pagina de Configuracoes do Inbox

Procurar onde ficam as configuracoes de inbox/atendimento para adicionar o toggle de "Tags obrigatorias ao encerrar conversa". Reutilizar o mesmo padrao de `useTicketFieldSettings` mas para conversas.

## Arquivos Modificados

1. **Migration SQL** — Seed `conversation_tags_required`
2. **`src/hooks/useConversationCloseSettings.tsx`** — Novo hook (leitura da config)
3. **`src/components/CloseConversationDialog.tsx`** — Validacao de tags + alerta visual
4. **`supabase/functions/close-conversation/index.ts`** — Registro enriquecido de metricas
5. **Pagina de configuracoes** — Toggle para ativar/desativar obrigatoriedade

## Secao Tecnica

### Dependencias
- `useConversationTags` ja existe em `src/hooks/useTags.tsx`
- `system_configurations` ja tem RLS configurada
- `conversation_tags` ja tem tabela e RLS
- AlertDialog components ja disponíveis

### Zero Regressao
- CloseConversationDialog continua funcionando normalmente quando `tagsRequired = false`
- Edge function so adiciona campos extras ao metadata (nao altera fluxo existente)
- CSAT, Kill Switch, Shadow Mode nao sao afetados
- Bulk close (`useBulkCloseConversations`) nao e alterado nesta fase (pode ser adicionado depois)

### Testes Obrigatorios
1. Ativar configuracao `conversation_tags_required = true`
2. Tentar encerrar conversa sem tags — deve bloquear com alerta claro
3. Adicionar tag na conversa e tentar novamente — deve permitir
4. Desativar configuracao — deve encerrar sem restricao
5. Verificar que CSAT continua funcionando normalmente
6. Verificar que timeline do contato registra tags e metricas
