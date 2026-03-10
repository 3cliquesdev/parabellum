

# Corrigir causa-raiz: conversas não atribuídas + visual de mensagens do fluxo

## Problema 1: Mensagens do fluxo com "visual pequeno"

**Causa encontrada**: No `process-buffered-messages/index.ts` (linha 536), quando o fluxo é re-invocado via `handleFlowReInvoke`, a mensagem de resposta é inserida com `sender_type: "system"`. Isso faz com que a mensagem seja renderizada como uma pill centralizada (texto pequeno) em vez de uma bolha de chat do nosso lado.

O `MessagesWithMedia.tsx` (linhas 215-225) renderiza `sender_type: 'system'` como:
```
<div className="bg-muted/50 px-4 py-2 rounded-full">
  <p className="text-xs text-muted-foreground">📢 {content}</p>
</div>
```

**Correção**: Mudar `sender_type: "system"` para `sender_type: "user"` e adicionar `is_ai_generated: true` no insert da linha 533-538 de `process-buffered-messages/index.ts`.

## Problema 2: Conversas ficam "não atribuídas"

**Análise da causa-raiz**: O dispatch funciona corretamente — ele cria jobs e atribui quando há agentes online com capacidade. As conversas ficam não atribuídas por uma combinação de:

1. **Agentes offline ou lotados**: O `findEligibleAgent` só busca agentes com `availability_status: 'online'` e com capacidade (`active_chats < max_chats`). Se todos estão offline ou no limite, a conversa fica na fila.

2. **Dispatch CRON não executa rápido o bastante**: O dispatch roda periodicamente mas pode não ser frequente o suficiente para redistribuir rapidamente.

3. **Jobs que escalam e ficam presos**: Quando um job atinge `max_attempts`, ele vai para status `escalated` e só é reprocessado quando um agente fica online.

**Correção proposta**: Tornar o filtro "Não atribuídas" mais inteligente, distinguindo entre conversas que estão em autopilot (atendidas pela IA, normal estar sem agente) vs conversas em `waiting_human`/`copilot` sem agente (problema real). Atualmente o filtro apenas verifica `!assigned_to`, incluindo conversas autopilot que não precisam de agente.

## Alterações

### 1. `supabase/functions/process-buffered-messages/index.ts`
- Linha 536: `sender_type: "system"` → `sender_type: "user"`, adicionar `is_ai_generated: true`

### 2. `src/pages/Inbox.tsx`  
- No `case "unassigned"` (linha 303-304): Refinar o filtro para mostrar apenas conversas que PRECISAM de humano mas não têm agente:
  ```
  c => !c.assigned_to && c.status !== 'closed' && c.ai_mode !== 'autopilot'
  ```
  Isso remove da lista as conversas sendo atendidas normalmente pela IA.

### 3. Edge function `get-inbox-counts` (se existir)
- Alinhar a contagem de "unassigned" com o mesmo critério (excluir autopilot sem agente).

