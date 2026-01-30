
# Plano: Filtro "Não Respondidas" no Estilo Octadesk

## Contexto

No Octadesk, o agente vê duas listas distintas na sidebar:
1. **Suas conversas** (2) - todas as conversas atribuídas ao agente
2. **Não respondidas** (1) - conversas do agente onde a última mensagem foi do cliente (aguardando resposta)

Isso evita que conversas "se percam" - o agente sempre sabe quais precisa responder.

## Diagnóstico Atual

### O que já existe:
- Campo `last_sender_type` no `inbox_view` (valores: `contact`, `user`, `system`)
- Contagem `notResponded` já calculada no backend (`get-inbox-counts`)
- Filtro na sidebar já exibe "Não respondidas" com contagem

### Problema:
O filtro `not_responded` em `Inbox.tsx` está com **placeholder** que não filtra nada:
```typescript
case "not_responded":
  // Last message from contact - would need last_sender_type field
  return result.filter(c => c.status !== 'closed'); // ← NÃO FILTRA!
```

Além disso, a contagem `notResponded` do backend mostra **TODAS** as conversas não respondidas do sistema, não apenas as do agente atual.

---

## Solução Proposta

### 1. Modificar contagem do backend para "Minhas Não Respondidas"

Adicionar nova contagem `myNotResponded` específica para conversas:
- Atribuídas ao usuário atual
- Com `last_sender_type = 'contact'`
- Status não fechado

### 2. Modificar filtro no frontend

Usar dados do `inboxItems` (que tem `last_sender_type`) para filtrar corretamente.

### 3. Separar visualmente na sidebar

Criar seção visual distinta no estilo Octadesk:
- **Minhas** (total de conversas atribuídas)
- **↳ Não respondidas** (subset - aguardando resposta do agente)

---

## Mudanças Técnicas

### Arquivo 1: `supabase/functions/get-inbox-counts/index.ts`

Adicionar campo `myNotResponded` calculado com filtro do usuário:

```typescript
// Linha ~228, após calcular notResponded
const myNotResponded = inboxActive.filter(
  (i: any) => i.last_sender_type === "contact" && i.assigned_to === userId
).length;
```

Atualizar tipo `InboxCounts`:
```typescript
type InboxCounts = {
  // ... existing fields
  myNotResponded: number;  // NOVO
};
```

### Arquivo 2: `src/hooks/useInboxView.tsx`

Atualizar interface `InboxCounts`:
```typescript
export interface InboxCounts {
  // ... existing
  myNotResponded: number;  // NOVO
}
```

### Arquivo 3: `src/pages/Inbox.tsx`

Corrigir o filtro `not_responded` para usar dados do `inboxItems`:

```typescript
case "not_responded":
  // Usar inboxItems para filtrar por last_sender_type
  const notRespondedIds = new Set(
    inboxItems
      ?.filter(item => 
        item.last_sender_type === 'contact' && 
        item.assigned_to === user?.id &&
        item.status !== 'closed'
      )
      .map(item => item.conversation_id) || []
  );
  return result.filter(c => notRespondedIds.has(c.id));
```

### Arquivo 4: `src/components/inbox/InboxSidebar.tsx`

Reorganizar layout da sidebar para mostrar "Não respondidas" como sub-item de "Minhas":

```typescript
// Após "Minhas"
<FilterItem
  icon={<User className="h-4 w-4" />}
  label="Minhas"
  count={counts.mine}
  isActive={isFilterActive("mine")}
  onClick={() => setFilter("mine")}
/>

{/* Sub-item indentado */}
<div className="pl-4">
  <FilterItem
    icon={<Clock className="h-4 w-4" />}
    label="Não respondidas"
    count={counts.myNotResponded}
    isActive={isFilterActive("not_responded")}
    onClick={() => setFilter("not_responded")}
    variant="warning"
  />
</div>
```

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `supabase/functions/get-inbox-counts/index.ts` | Adicionar `myNotResponded` |
| `src/hooks/useInboxView.tsx` | Atualizar interface `InboxCounts` |
| `src/pages/Inbox.tsx` | Corrigir filtro `not_responded` |
| `src/components/inbox/InboxSidebar.tsx` | Reorganizar layout visual |

---

## Fluxo Visual Após Implementação

```text
┌──────────────────────────────┐
│  📬 Conversas                │
├──────────────────────────────┤
│  🔹 Todas           (150)    │
│  👤 Minhas           (8)     │
│    └→ 🕐 Não respondidas (3) │  ← Sub-item destacado
│  ⚠️ SLA Excedido     (2)     │
│  ❌ Não atribuídas   (12)    │
│  ─────────────────────────── │
│  🤖 Fila IA          (45)    │
│  👥 Fila Humana      (80)    │
└──────────────────────────────┘
```

---

## Regras Aplicadas (Base de Conhecimento)

- **Upgrade, não downgrade**: Melhoria que não quebra nada existente
- **Preservação do existente**: Mantém filtro `notResponded` global para gestores
- **Zero regressão**: Lógica atual permanece funcional

---

## Validação

Após implementação:
1. Agente com 5 conversas, 2 aguardando resposta
2. **Minhas** deve mostrar `(5)`
3. **Não respondidas** deve mostrar `(2)` - apenas as do agente
4. Filtro `not_responded` deve listar apenas as 2 conversas corretas
