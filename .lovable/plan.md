

# Análise: Todos os nós estão sendo executados pelo engine?

## Nós registrados no Frontend (Editor)
| Nó | Tipo |
|---|---|
| Mensagem | `message` |
| Perguntar Nome | `ask_name` |
| Perguntar Email | `ask_email` |
| Perguntar Telefone | `ask_phone` |
| Perguntar CPF | `ask_cpf` |
| Múltipla Escolha | `ask_options` |
| Pergunta Aberta | `ask_text` |
| Condição | `condition` |
| Resposta IA | `ai_response` |
| Transferir | `transfer` |
| Fim | `end` |
| Buscar Pedido | `fetch_order` |

## Status no Engine (`process-chat-flow/index.ts`)

| Nó | Tratado? | Detalhes |
|---|---|---|
| `message` | ✅ | Entrega mensagem + auto-avanço para próximo nó interativo |
| `ask_name` | ✅ | Validação de nome + coleta `save_as` |
| `ask_email` | ✅ | Validação de email regex |
| `ask_phone` | ✅ | Validação 10-11 dígitos |
| `ask_cpf` | ✅ | Validação 11 dígitos |
| `ask_options` | ✅ | Match estrito (número ou texto exato), reenvio se inválido |
| `ask_text` | ⚠️ **Parcial** | Funciona pela lógica genérica (linha 1498-1521), mas **não entra como `waiting_input`** na criação do estado (linha 674 falta `ask_text`) |
| `condition` | ✅ | Clássica, multi-regra e inatividade |
| `ai_response` | ✅ | Modo persistente, exit keywords, max interactions, trava financeira |
| `transfer` | ✅ | Mensagem + dados de transferência |
| `end` | ✅ | Mensagem final, marca `completed` |
| `fetch_order` | ✅ | Handler especial com auto-avanço |

## Problema encontrado: `ask_text`

O nó `ask_text` funciona na prática porque cai na lógica genérica (salva `save_as`, avança), **mas** há um bug sutil:

Na **linha 674**, o `initialStatus` para fluxos manuais só define `waiting_input` para `ask_options`, `ask_input` e `condition`. O tipo `ask_text` (e `ask_name`, `ask_email`, `ask_phone`, `ask_cpf`) ficam como `active` em vez de `waiting_input`.

Isso significa que o hook `useActiveFlowState` (que busca estados `in_progress`, `active`, `waiting_input`) **ainda encontra** esses nós. Porém, conceitualmente, todos os nós `ask_*` deveriam ser `waiting_input` porque esperam resposta do usuário.

### Fix proposto

**Arquivo:** `supabase/functions/process-chat-flow/index.ts`

**Linha 674** — Expandir a condição para incluir todos os nós `ask_*`:

```typescript
const initialStatus = (
  contentNode.type === 'ask_options' || 
  contentNode.type === 'ask_input' || 
  contentNode.type === 'ask_text' || 
  contentNode.type === 'ask_name' || 
  contentNode.type === 'ask_email' || 
  contentNode.type === 'ask_phone' || 
  contentNode.type === 'ask_cpf' || 
  contentNode.type === 'condition'
) ? 'waiting_input' : 'active';
```

Ou de forma mais limpa:

```typescript
const initialStatus = contentNode.type.startsWith('ask_') || contentNode.type === 'condition'
  ? 'waiting_input' : 'active';
```

## Resumo

- **11 de 12 nós** funcionam corretamente no engine
- `ask_text` funciona mas com status semântico errado (`active` em vez de `waiting_input`)
- O fix é uma linha — mudar a condição de `initialStatus` para cobrir todos os tipos `ask_*`
- Impacto zero em funcionalidade existente (upgrade puro de consistência semântica)

