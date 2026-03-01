

# Adicionar campo "Tem Consultor?" ao condition selector dos fluxos

## Problema
O editor de fluxos não oferece a opção de verificar se um contato tem consultor atribuído (`consultant_id`). Isso impede criar lógica condicional tipo: "se tem consultor → copilot, senão → fila".

## Mudanças

### 1. `src/components/chat-flows/variableCatalog.ts`
- Adicionar `{ value: "consultant_id", label: "Tem Consultor?" }` ao `CONDITION_CONTACT_FIELDS`
- Adicionar `{ value: "contact_consultant_id", label: "Consultor do Contato", group: "contact" }` ao `CONTACT_VARS`

### 2. `supabase/functions/process-chat-flow/index.ts`
- No `getVar()`, garantir que `consultant_id` resolve corretamente de `contactData.consultant_id`
- No `buildVariablesContext()`, incluir `contact_consultant_id` no contexto
- Na avaliação de condição com `has_data` + `consultant_id`: retorna `true` se `consultant_id` não é null/vazio

### 3. `src/components/chat-flows/nodes/ConditionNode.tsx`
- Adicionar `"consultant_id": "Tem Consultor?"` ao `friendlyFieldNames` para exibição visual no nó

## Resultado
O usuário poderá criar condições como:
- **Campo:** "Tem Consultor?" / **Tipo:** "has_data" → rota Yes/No
- Permitindo fluxos que direcionam clientes com consultor para copilot e sem consultor para fila/departamento

