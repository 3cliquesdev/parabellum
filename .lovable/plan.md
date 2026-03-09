

# Adicionar Tags de Conversas + Tickets do Dia ao Relatório

## O que muda

Duas novas seções no relatório diário (WhatsApp + Email + Prompt IA):

1. **HOJE — Top Tags de Conversas**: As tags mais frequentes aplicadas nas conversas do dia, com contagem e sugestão de ação da IA para cada cluster.

2. **HOJE — Tickets do Dia**: Tickets criados hoje com resumo (prioridade, status, categoria) e sugestão da IA para o próximo dia.

## Implementação — `supabase/functions/ai-governor/index.ts`

### 1. Nova coleta: `collectConversationTags` (dentro de `collectDayMetrics`)

Query `conversation_tags` do dia com join em `tags(name, color)`, agrupando por tag name e contando ocorrências:

```typescript
const { data: convTagsData } = await supabase
  .from('conversation_tags')
  .select('tag_id, tags(name, color), conversation_id')
  .gte('created_at', since)
  .lt('created_at', until);
```

Agrupa por tag name → top 10 por contagem. Retorna no objeto de métricas como `topConversationTags: Array<{name, count}>`.

### 2. Nova coleta: `collectTicketsToday` (dentro de `collectDayMetrics`)

Query `tickets` criados no dia:

```typescript
const { data: ticketsToday } = await supabase
  .from('tickets')
  .select('id, ticket_number, subject, status, priority, category, created_at')
  .gte('created_at', since)
  .lt('created_at', until)
  .order('priority', { ascending: true })
  .limit(20);
```

Retorna: total de tickets, breakdown por prioridade (urgent/high/medium/low), top 5 por prioridade, e categorias mais frequentes.

### 3. WhatsApp — novas seções

Após a seção de Atendimento:

```
🏷️ *HOJE — Tags de Conversas*
1. Suporte Tecnico (45x)
2. Duvida Pagamento (32x)
3. Cancelamento (18x)
...

🎫 *HOJE — Tickets*
Total: 12 | Urgentes: 2 | Abertos: 8
Top: #1234 Erro no checkout (urgente)
     #1235 Problema de login (alta)
```

### 4. Prompt da IA — enriquecer com tags + tickets

Adicionar ao bloco `===== HOJE =====`:

```
TAGS DE CONVERSAS HOJE:
- Suporte Tecnico: 45x | Duvida Pagamento: 32x | ...

TICKETS HOJE:
- Total: 12 | Urgentes: 2 | Alta: 4 | Media: 5 | Baixa: 1
- Top categorias: checkout (5), login (3), pagamento (2)
```

Adicionar instrução ao prompt:
```
[SUGESTOES] deve incluir: 1 acao baseada nas tags mais frequentes, 1 acao baseada nos tickets urgentes
```

### 5. Email HTML — novas seções

Duas novas `<tr>` sections no HTML com a mesma estrutura visual das demais (cards coloridos para tags, tabela para tickets).

### 6. `collectDayMetrics` retorna campos adicionais

```typescript
return {
  ...existingFields,
  topConversationTags,  // [{name, count}]
  ticketsTodayTotal,
  ticketsByPriority,    // {urgent, high, medium, low}
  ticketsTopSubjects,   // [{ticket_number, subject, priority}] top 5
  ticketsCategories,    // [{category, count}] top 5
};
```

## Impacto
- Zero regressão — apenas adiciona novas queries e seções
- Relatório ganha contexto operacional: tags mostram "o que mais incomoda" e tickets mostram "o que precisa resolver"
- IA consegue sugerir ações específicas para o próximo dia baseadas em dados reais

