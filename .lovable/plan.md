

# P1.1 — Upgrades pendentes no create_ticket

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Status: P1.1 já está 85% implementado

O trabalho anterior já entregou:
- ✅ `createTicketFromFlow()` com idempotência (`idempotency_key` unique)
- ✅ EndNode `end_action === 'create_ticket'` handler (2 locais: pós-input e pós-auto-advance)
- ✅ Mid-flow `create_ticket` node no auto-advance loop
- ✅ Frontend: `CreateTicketNode.tsx`, properties panel, registro no editor
- ✅ `ai_events` log com `flow_create_ticket`
- ✅ Migration com coluna `idempotency_key` na tabela tickets

## Gaps identificados (upgrades do checklist do usuário)

### 1. Backend: `createTicketFromFlow` falta campos extras
A função aceita apenas: subject, description, category, priority, contactId, conversationId.
**Faltam**: `department_id`, `internal_note`, `use_collected_data` (snapshot em metadata).

**Ação**: Expandir opts e insert para incluir:
- `department_id` (nullable)
- `internal_note` (template resolvido via replaceVariables)
- `metadata` JSON com `flow_state_id`, `node_id`, `idempotency_key`, e `collected_data` snapshot quando `use_collected_data=true`
- Salvar `collectedData.__last_ticket_id = ticket.id` após criação

### 2. Frontend: Properties panel falta campos extras
O panel do `create_ticket` node tem: subject, description, category, priority.
**Faltam**: `department_id` (select), `internal_note` (VariableAutocomplete), `use_collected_data` (checkbox).

Mesma lacuna no EndNode `create_ticket` config (linhas 900-961).

**Ação**: Adicionar 3 campos em ambos os painéis (mid-flow node + EndNode action).

### 3. Anti-duplicidade: Flow ativo bloqueia tool call
`classify_and_resolve_ticket` no `ai-autopilot-chat` não verifica se existe flow ativo. Guards atuais: kill switch, shadow mode, `ai_can_classify_ticket` flag. Mas se flow está ativo com nó `create_ticket`, a IA pode criar ticket duplicado via tool call.

**Ação**: Adicionar guard no handler de `classify_and_resolve_ticket`:
- Query `chat_flow_states` para flow ativo da conversa
- Se existe flow ativo → bloquear tool call com log em `ai_events`
- Regra simples: "flow ativo = não cria ticket por tool call" (soberania do fluxo)

## Resumo de alterações

| Arquivo | Mudança |
|---------|---------|
| `process-chat-flow/index.ts` | Expandir `createTicketFromFlow` com department_id, internal_note, metadata/collected_data, __last_ticket_id |
| `process-chat-flow/index.ts` | Atualizar 3 call sites para passar novos campos |
| `ChatFlowEditor.tsx` | Adicionar department_id, internal_note, use_collected_data nos 2 painéis |
| `ai-autopilot-chat/index.ts` | Guard em classify_and_resolve_ticket: bloquear se flow ativo |

Sem migration necessária (department_id e internal_note já existem na tabela tickets; metadata é jsonb existente).

