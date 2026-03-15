

# Diagnóstico e Correção dos Bugs do Fluxo de Atendimento

## Bugs Identificados

### Bug 1: Helper respondeu sem contexto (Aurélio entrou no lugar)
**Causa raiz confirmada nos logs:**
```
🧪 TEST MODE: Chamando ai-autopilot-chat sem flow context
```
Quando a conversa está em **Modo Teste**, o webhook (`meta-whatsapp-webhook`) usa o caminho `test_mode_ai_allowed` (linha 2316) que chama `ai-autopilot-chat` **sem `flow_context`**. Sem flow_context, o autopilot faz um "early check" interno (linha 3326) que chama `process-chat-flow` sem propagar persona/KB. O resultado retorna `personaId: null`, então o fallback carrega a **Persona Global "Aurélio"** em vez da persona configurada no nó (Helper).

Aurélio tem 0 tools e `persona_categories: null` (acesso global sem filtro KB), então responde sem contexto e transfere imediatamente.

### Bug 2: Aurélio entrando na conversa sem estar no fluxo
Mesmo problema — é a **Persona Global** sendo usada como fallback quando o `personaId` do nó não é propagado. Aurélio não está "no fluxo", mas é chamado porque é a persona global configurada em `system_configurations.ai_default_persona_id`.

### Bug 3: Transferência para departamento errado
Como Aurélio não tem as restrições (`forbidQuestions`, `forbidFinancial`, etc.) do nó Helper configurado no fluxo, ele não respeita as regras de roteamento e transfere arbitrariamente.

### Bug 4: TAG de encerramento
O `classify_and_resolve_ticket` classifica em categorias (ticket) mas **não aplica tags em `conversation_tags`** automaticamente. Tags só são aplicadas em cenários after-hours. Se a conversa foi encerrada via `close_conversation`, a tag dependeria de ter sido gerada pelo ticket ou manualmente.

---

## Plano de Correção

### 1. Fix principal: Propagar `flow_context` no TEST MODE (webhook)
**Arquivo:** `supabase/functions/meta-whatsapp-webhook/index.ts` (linhas 2314-2345)

O caminho `test_mode_ai_allowed` precisa construir o `flow_context` a partir do `flowData` retornado pelo `process-chat-flow`, da mesma forma que o CASO 3 (`aiNodeActive`) já faz. Mudança:

- Quando `test_mode_ai_allowed`, verificar se existe um `chat_flow_states` ativo para a conversa
- Se existir, re-invocar `process-chat-flow` com a mensagem e usar o resultado para montar o `flow_context` com `personaId`, `kbCategories`, `contextPrompt`, etc.
- Passar esse `flow_context` ao chamar `ai-autopilot-chat`

### 2. Fix de resiliência: Early check no autopilot deve herdar estado do fluxo
**Arquivo:** `supabase/functions/ai-autopilot-chat/index.ts` (linhas 3326-3542)

Quando o autopilot faz o early check interno e `process-chat-flow` retorna `useAI: true`, garantir que `personaId`, `kbCategories` e demais campos do nó ativo sejam propagados no retorno. Atualmente o `process-chat-flow` retorna esses campos corretamente no caminho `aiNodeActive` (linhas 5267-5296), mas quando chamado pelo early check sem messageContent relevante, o caminho pode não retornar tudo.

### 3. Fix de tags no encerramento
**Arquivo:** `supabase/functions/ai-autopilot-chat/index.ts`

No handler de `classify_and_resolve_ticket`, após classificar o ticket, aplicar a tag correspondente à categoria na `conversation_tags`. Mapear as categorias do ticket para tags existentes (ou criar se necessário).

---

## Arquivos Impactados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/meta-whatsapp-webhook/index.ts` | Propagar flow_context no TEST MODE |
| `supabase/functions/ai-autopilot-chat/index.ts` | Resiliência no early check + tags no classify |
| `supabase/functions/process-chat-flow/index.ts` | Garantir personaId no retorno de todos os caminhos useAI |

