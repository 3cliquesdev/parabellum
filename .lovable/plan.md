

# Multi-Select de Agentes no Relatorio de Tickets

## Problema
Atualmente o filtro de agentes permite selecionar apenas 1 agente por vez. O usuario quer marcar varios agentes para filtrar/exportar o relatorio.

## Solucao

### 1. Migration: Alterar a RPC para aceitar array de UUIDs

Recriar a funcao `get_tickets_export_report` trocando o parametro `p_agent_id uuid` por `p_agent_ids uuid[]` (array). A clausula WHERE muda de:

```sql
AND (p_agent_id IS NULL OR t.assigned_to = p_agent_id)
```
para:
```sql
AND (p_agent_ids IS NULL OR t.assigned_to = ANY(p_agent_ids))
```

Quando o array for NULL (nenhum agente selecionado), retorna todos. Quando tiver IDs, filtra por qualquer um deles.

### 2. Alterar tipo `TicketExportFilters`

**Arquivo**: `src/hooks/useTicketsExportReport.tsx`

- Trocar `agentId: string` por `agentIds: string[]`
- No queryFn, enviar `p_agent_ids` como array (ou omitir se vazio)

### 3. Alterar `useExportTicketsExcel.tsx`

- Mesmo ajuste: usar `filters.agentIds` e enviar `p_agent_ids` ao inves de `p_agent_id`

### 4. Alterar UI em `TicketsExportReport.tsx`

- Trocar o `<Select>` de agente por um componente multi-select com checkboxes (Popover + lista de checkboxes, similar ao `AssignedToMultiSelect` que ja existe no projeto)
- State inicial: `agentIds: []` (vazio = todos)
- O botao mostra "Todos Agentes" quando vazio, ou "X agentes" quando ha selecao

### 5. Arquivos impactados

| Arquivo | Mudanca |
|---------|---------|
| Migration SQL | Recriar RPC com `p_agent_ids uuid[]` |
| `src/hooks/useTicketsExportReport.tsx` | `agentId` -> `agentIds: string[]`, enviar como array |
| `src/hooks/useExportTicketsExcel.tsx` | Mesmo ajuste no params |
| `src/pages/TicketsExportReport.tsx` | Multi-select com checkboxes no lugar do Select simples |

### 6. Zero regressao
- A RPC continua retornando os mesmos dados
- Quando nenhum agente selecionado (array NULL), comportamento identico ao atual "Todos Agentes"
- Nenhum outro componente usa esta RPC

