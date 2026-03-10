

# Fix: Todos os filtros das Encerradas devem ir ao banco

## Problema

O mesmo problema que afetou `aiMode` e `dateRange` afeta **todos os outros filtros** (canais, departamento, atribuído, tags): eles são aplicados **client-side** sobre os 1000 registros do `limit()`. Se o filtro combinado (ex: data + modo IA) resulta em dados que estão fora desses 1000 registros genéricos, o resultado é zero.

**Além disso**, os filtros `dateRange` e `aiMode` são aplicados **duas vezes** — uma no banco e outra client-side em `applyFilters()`. Se houver diferença de timezone entre as duas comparações, o client-side pode descartar resultados válidos.

## Correção

### 1. Mover TODOS os filtros para o banco (scope `archived`)

**`FetchOptions`**: Adicionar campos `channels`, `department`, `assignedTo`.

**`fetchInboxData`**: Quando `scope === 'archived'`, aplicar no banco:
- `channels` → `.overlaps("channels", [...])`  
- `department` → `.eq("department", value)`
- `assignedTo` → `.eq("assigned_to", value)` ou `.is("assigned_to", null)` para "unassigned"

### 2. Evitar double-filtering no `applyFilters`

Na função `applyFilters`, quando `scope === 'archived'`, **pular** os filtros que já foram aplicados no banco: `dateRange`, `aiMode`, `channels`, `department`, `assignedTo`. Isso elimina possíveis discrepâncias de timezone e melhora performance.

### 3. Incluir novos filtros no `fetchOptions` e `queryKey`

Adicionar `channels`, `department`, `assignedTo` ao memo `fetchOptions` e à `queryKey` (apenas para `scope === 'archived'`), para que mudanças no filtro disparem novo fetch.

### 4. Tag filter — manter client-side

O filtro de tags usa uma tabela separada (`conversation_tags`), então continua como está (client-side com `useTagConversationIds`).

## Resultado

Qualquer combinação de filtros nas encerradas (data + modo IA + canal + departamento + agente) vai buscar diretamente do banco, retornando até 1000 resultados precisos em vez de filtrar um subset genérico.

