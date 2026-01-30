
Analisei o projeto atual e sigo as regras da base de conhecimento.

## Diagnóstico (o que realmente aconteceu)

### 1) “Você encerrou minha conversa”
Eu verifiquei no backend uma conversa exemplo citada anteriormente (`054ac019-9ee4-444c-aa0f-f38a39202368`) e ela está **status = open**, com `closed_at = null` e `auto_closed = false`. Ou seja: o que você está vendo como “encerrada” está acontecendo por **inconsistência de listagem/filtragem na UI**, não porque o filtro “fechou” a conversa.

O que pode dar a sensação de “encerrada”:
- A lista do Inbox some/mostra “nenhuma conversa”, e parece que a conversa “foi embora”.
- Mensagens/avisos do sistema sobre “conversas encerradas por inatividade” (job automático) aparecem e confundem com a conversa atual.
- A UI pode estar montando “objetos mínimos” e cruzando dados com o cache errado, levando a “ghosting”.

### 2) Por que o filtro “Não respondidas” mostra badge (1) mas não lista?
Hoje o Inbox tem **duas fontes**:
- `useInboxCounts` (badge) vem de uma lógica no backend (precisa ser fonte de verdade).
- A lista do filtro `not_responded` no `Inbox.tsx` tenta deduzir as conversas via `useInboxView()` + cache local, e isso é **frágil**:
  - pode não ter sincronizado `assigned_to/last_sender_type` no momento,
  - pode haver mismatch entre `conversations` e `inbox_view`,
  - e ainda existe um problema estrutural: `filteredConversations` retorna `[]` quando `conversations` está `undefined` (isso causa “sumiço” geral em alguns momentos).

Na prática: o badge está certo, a lista está errada.

## Objetivo do upgrade (sem regressão)
1) **Filtro “Não respondidas” robusto**: a lista deve bater com o badge e nunca “sumir”.
2) **Filtro não pode fechar conversa**: garantir que a lógica de filtro seja 100% read-only.
3) **Zero regressão**: “Todas”, “Minhas”, busca global, ordenação SLA e realtime continuam funcionando.

---

## Solução proposta (arquitetura)

### A) Tornar “Não respondidas” uma consulta direta e determinística no backend (via inbox_view)
Criar um hook dedicado (frontend) para buscar *somente* as “Não respondidas” do usuário atual, com filtros no banco:

Critérios (alinhados ao comportamento atual do inbox_view):
- `assigned_to = user.id`
- `status = 'open'`
- `last_sender_type = 'contact'`
- (opcional) `unread_count > 0` como reforço, mas **não obrigatório** (vamos decidir na implementação para bater com o badge)

Isso elimina dependência de:
- `rawInboxItems`
- interseção com `conversations`
- estado transitório do cache

**Upgrade**: a lista passa a ser “fonte de verdade” igual ao badge.

### B) Remover o “ponto único de falha” no Inbox.tsx que faz a lista virar vazia
Hoje existe:
```ts
if (!conversations) return [];
```
Isso é perigoso porque `useInboxView` pode estar carregado e `useConversations` ainda não, e aí a lista some.

Vamos ajustar para:
- Quando `conversations` ainda não estiver pronto, a lista pode renderizar usando `inboxItems` (objeto mínimo) sem sumir.
- Quando `conversations` chegar, enriquecemos com dados completos automaticamente.

### C) Manter “conversa completa” só quando necessário
A lista pode renderizar com objeto mínimo (derivado do `inbox_view`) sem alterar dados.
Quando o usuário clicar numa conversa, a UI já abre chat com base no `id` e os hooks de mensagens normalmente conseguem carregar pelo `conversation_id`. Se existir algum ponto do ChatWindow que exija campos “completos”, vamos complementar:
- buscar/derivar campos mínimos necessários sem escrever nada no banco.

---

## Mudanças planejadas (passo a passo)

### 1) Criar hook dedicado: `useMyNotRespondedInboxItems`
**Novo arquivo**: `src/hooks/useMyNotRespondedInboxItems.tsx`

- Usa React Query para buscar diretamente na tabela `inbox_view`.
- QueryKey inclui `user?.id` para cache correto.
- Ordenação: `updated_at ASC` (mantém prioridade “mais antigas primeiro” como já adotado no inbox_view).
- Limit: 5000 (padrão do projeto para consistência).

Pseudo:
```ts
supabase
  .from("inbox_view")
  .select("*")
  .eq("assigned_to", user.id)
  .eq("status", "open")
  .eq("last_sender_type", "contact")
  .order("updated_at", { ascending: true })
  .limit(5000)
```

### 2) Refatorar `Inbox.tsx` para usar esse hook quando `filter === "not_responded"`
**Arquivo**: `src/pages/Inbox.tsx`

- Importar `useMyNotRespondedInboxItems`.
- Substituir o bloco atual do `not_responded` para:
  - usar `myNotRespondedItems` como fonte
  - mapear itens para `Conversation` via helper existente (ou um helper ajustado)
- Ajustar a lógica para **não depender de `conversations` estar carregado**.

### 3) Ajustar `filteredConversations` para não “zerar a lista” quando `conversations` estiver indefinido
**Arquivo**: `src/pages/Inbox.tsx`

- Remover `if (!conversations) return []`.
- Em vez disso:
  - `const fullConversations = conversations ?? []`
  - `const canUseInboxItems = inboxItems?.length`
  - Para o “default” (all/human_queue/ai_queue/mine etc), quando `conversations` ainda não existe, construir lista a partir de `inboxItems` (mínimo) para não sumir.

Isso é crítico para “regressão zero”: evita o efeito “sumiu minhas conversas”.

### 4) Garantia “filtro nunca escreve no banco”
- Revisar se existe qualquer `mutate()` ou `update()` disparado em troca de filtros (não deve existir).
- Confirmar que o `not_responded` usa apenas `.select()`.

### 5) (Upgrade de segurança operacional) Proteção contra encerramento acidental
Como você relatou “encerrou sozinho”, vamos adicionar uma proteção opcional (não quebra nada existente):
- **Confirmar encerramento em massa** (bulk close) com modal de confirmação mais explícito (se ainda não existir).
- Se já existir confirmação, fortalecer texto para evitar clique acidental.
- Isso reduz risco do time “perder conversas” por erro humano.

---

## Impactos e mitigação (Zero Regressão)

### Impactos esperados
- “Não respondidas” passa a ser consistente com o badge.
- Lista não some mais por timing entre queries.
- Pequeno aumento de 1 query quando o filtro `not_responded` está ativo (somente nesse filtro).

### Mitigação
- Query tem limit 5000 e usa campos indexáveis (assigned_to/status).
- Cache do React Query evita refetch excessivo.
- Não altera regras de visibilidade nem RLS.

### Rollback rápido
- O rollback é simples: voltar o filtro `not_responded` para usar `rawInboxItems` (1 bloco no Inbox.tsx) e remover o hook novo.
- Como é mudança isolada, dá para reverter em minutos.

---

## Testes obrigatórios (antes de publicar)

1) Inbox → filtro “Não respondidas”:
   - badge > 0 e lista mostra as conversas correspondentes.
2) Trocar entre “Todas” / “Minhas” / “Não respondidas” rapidamente:
   - lista não pode “sumir” nem piscar para vazio.
3) Buscar por email/telefone/ID:
   - continua funcionando.
4) Realtime:
   - ao chegar mensagem do contato numa conversa atribuída ao usuário, ela deve aparecer em “Não respondidas”.
5) Sem internet / reconectar:
   - ao reconectar, “Não respondidas” volta correto.
6) Console:
   - sem erros.
7) Confirmar que nenhum `UPDATE conversations set status='closed'` é disparado ao trocar filtro (somente ao clicar explicitamente em Encerrar).

---

## Entrega (o que você vai ver após o ajuste)
- “Não respondidas (1)” sempre lista a conversa.
- A conversa não será encerrada por filtro.
- Mesmo com inconsistências temporárias entre caches, a lista não some.

