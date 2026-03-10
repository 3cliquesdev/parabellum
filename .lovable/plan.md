

# Fix: Filtro "Somente IA" nas Encerradas mostra apenas 2 de 1103

## Problema

Existem **1.103 conversas** encerradas com `ai_mode = 'autopilot'` no banco, mas o filtro mostra apenas 2.

**Causa raiz**: A query ao banco busca as **1000 conversas encerradas mais recentes** (linha 85: `.limit(1000)`), sem filtrar por `ai_mode`. O filtro `ai_only` é aplicado **client-side** depois. Das 1000 conversas retornadas, apenas 2 têm `ai_mode = 'autopilot'` — as outras 1101 ficaram de fora do resultado.

## Correção

Passar o filtro `aiMode` para a função `fetchInboxData` e aplicá-lo na query ao banco **antes** do `.limit()`:

### Alterações em `src/hooks/useInboxView.tsx`:

1. **`fetchInboxData`** (linhas 59-111): Aceitar parâmetro `aiMode` opcional. Quando presente e `scope === 'archived'`:
   - `ai_only` → `.eq("ai_mode", "autopilot")`
   - `ai_all` → `.in("ai_mode", ["autopilot", "copilot", "waiting_human"])`
   - Outros valores → `.eq("ai_mode", valor)`

2. **`fetchOptions` memo** (linha 297): Incluir `filters?.aiMode` nas opções passadas à query.

3. **`queryKey`** (linha 309): Adicionar `filters?.aiMode` à key para que mudança no filtro dispare refetch.

## Resultado

- Filtro "Somente IA" nas encerradas trará até 1000 conversas **que são autopilot**, em vez de 2 acidentais.
- Filtros nas conversas ativas continuam iguais (client-side é suficiente para 500 itens ativos).

