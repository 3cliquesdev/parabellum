
# Auto-assign ao enviar mensagem — CONCLUÍDO (10/03/2026)

## Problema
Agentes enviavam mensagens via composer sem clicar "Assumir", deixando `assigned_to: null` e `ai_mode: waiting_human`. Quando o contato respondia, o sistema disparava mensagem de fila.

## Solução aplicada

1. **RPC `auto_assign_on_send`** (SECURITY DEFINER):
   - Se `assigned_to` é null e `ai_mode` é `waiting_human` ou `autopilot`, atribui ao agente e muda para `copilot`
   - Cancela `chat_flow_states` ativos
   - Retorna `{ assigned: true/false }`

2. **`src/hooks/useSendMessageInstant.tsx`**:
   - Após persistir mensagem não-interna, chama `auto_assign_on_send` em background
   - Invalida caches de conversations, ai-mode e inbox-view quando auto-assign ocorre

## Impacto
- Agentes que respondem sem clicar "Assumir" são automaticamente atribuídos
- Evita que dispatch/IA interfira em conversas onde humano já está respondendo
- Zero impacto em conversas já atribuídas ou em modo `disabled`
