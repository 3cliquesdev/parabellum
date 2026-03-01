

# Reprocessar fluxo da conversa F19FE7CE

## Diagnóstico atualizado

O `process-chat-flow` **NÃO verifica Shadow Mode** — ele processa fluxos normalmente. A causa real do travamento precisa ser investigada nos logs de execução, mas o reprocessamento é seguro.

## Plano de execução

### 1. Limpar o estado atual do fluxo
Deletar o registro em `chat_flow_states` (id: `6dde3546-7787-4292-a54a-b365af431ed3`) que está travado no nó `welcome_ia` com status `active`.

### 2. Invocar `process-chat-flow` com manualTrigger
Chamar a edge function com:
- `conversationId`: `f19fe7ce-6de8-4f9e-bd14-3bae72f98eca`
- `flowId`: `e44da799-c404-4c86-abe0-4aea2ca0ea1f`
- `manualTrigger`: `true`
- `userMessage`: `"Oi"` (mensagem original do cliente)

Isso reinicia o fluxo desde o início e executa a travessia de nós até chegar ao `welcome_ia` (nó de mensagem), que será enviado ao WhatsApp do cliente.

### 3. Verificar resultado
Checar nos logs da edge function e na tabela `messages` se a mensagem de boas-vindas foi entregue.

## Risco
Nenhum downgrade. A conversa já está parada sem resposta — reprocessar é a ação correta. O Kill Switch está desligado (`ai_global_enabled = true`) e o fluxo está ativo.

