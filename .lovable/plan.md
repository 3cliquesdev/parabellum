
## Correção: Departamento e Atendente não aparecem na lista de conversas

### Problema

O componente `ConversationListItem` renderiza badges de departamento (linha 328) e atendente (linha 362) apenas quando `conversation.department_data` e `conversation.assigned_user` existem como objetos com nome/cor. Porém, a função `inboxItemToConversation` no `Inbox.tsx` **nunca monta esses objetos** — ela só tem os UUIDs (`department` e `assigned_to`), sem os nomes correspondentes.

### Causa

A tabela `inbox_view` possui apenas `department` (UUID) e `assigned_to` (UUID), sem colunas de nome/cor do departamento ou nome/avatar do agente. A conversão para o tipo `Conversation` não resolve esses UUIDs em objetos com dados legíveis.

### Solução (3 passos)

**Passo 1 — Migração SQL: adicionar colunas desnormalizadas ao `inbox_view`**

Adicionar ao `inbox_view`:
- `department_name` (text)
- `department_color` (text)
- `assigned_agent_name` (text)
- `assigned_agent_avatar` (text)

Atualizar os triggers de sincronização para popularem esses campos a partir das tabelas `departments` e `profiles` via lookup na inserção/atualização.

**Passo 2 — Atualizar tipo `InboxViewItem` em `useInboxView.tsx`**

Adicionar os 4 novos campos na interface:

```
department_name: string | null;
department_color: string | null;
assigned_agent_name: string | null;
assigned_agent_avatar: string | null;
```

**Passo 3 — Mapear os objetos em `inboxItemToConversation` no `Inbox.tsx`**

Construir `department_data` e `assigned_user` a partir dos novos campos:

```typescript
department_data: item.department_name ? {
  id: item.department,
  name: item.department_name,
  color: item.department_color || null,
} : null,

assigned_user: item.assigned_agent_name ? {
  id: item.assigned_to,
  full_name: item.assigned_agent_name,
  avatar_url: item.assigned_agent_avatar || null,
  job_title: null,
} : null,
```

### Arquivos alterados

1. **Migração SQL** — Alterar `inbox_view` e triggers de sincronização
2. **`src/hooks/useInboxView.tsx`** — Adicionar 4 campos na interface
3. **`src/pages/Inbox.tsx`** — Montar objetos `department_data` e `assigned_user`

### Impacto

- Zero regressão: badges já existem no componente, só faltavam os dados
- Restaura funcionalidade que existia anteriormente
- Escopo cirúrgico: mesmos 3 arquivos + 1 migração do fix anterior
