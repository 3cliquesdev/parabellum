

# Fix: Relatório de Conversas mostrando dados limitados (09/02 a 12/02)

## Problema Identificado

Duas causas raiz encontradas:

### Causa 1: Inconsistência no tratamento da data final

O hook da **tabela** (`useCommercialConversationsReport`) passa `endDate.toISOString()` diretamente para a RPC, enquanto o hook de **exportação** (`useExportConversationsCSV`) adiciona +1 dia para criar um range exclusivo correto. A RPC usa `c.created_at < p_end` (exclusivo), ou seja, precisa do +1 dia.

```
-- SQL da RPC
WHERE c.created_at >= p_start AND c.created_at < p_end
```

- Tabela: `p_end = endDate.toISOString()` (pode cortar ultimo dia por timezone)
- Export: `p_end = endDate + 1 dia` (correto)

### Causa 2: Falta de feedback visual do total

O usuario nao tem visibilidade clara do total de registros quando esta na pagina 1. Se o total e grande mas so 50 aparecem, parece que faltam dados.

## Solucao

### 1. Corrigir `useCommercialConversationsReport.tsx`

Adicionar logica de +1 dia exclusivo na data final, identica ao export:

```typescript
// ANTES (bugado)
p_end: filters.endDate.toISOString(),

// DEPOIS (correto)
const endExclusive = new Date(filters.endDate);
endExclusive.setDate(endExclusive.getDate() + 1);
endExclusive.setHours(0, 0, 0, 0);
p_end: endExclusive.toISOString(),
```

### 2. Melhorar feedback na `CommercialDetailedTable.tsx`

Mostrar total de registros SEMPRE (nao so quando ha mais de 1 pagina), para o usuario saber quantas conversas existem no periodo.

### 3. Melhorar logs de debug

Adicionar log dos parametros finais enviados a RPC (com o endExclusive) para facilitar diagnostico futuro.

## Arquivos Modificados

1. `src/hooks/useCommercialConversationsReport.tsx` -- Corrigir p_end com +1 dia exclusivo
2. `src/components/reports/commercial/CommercialDetailedTable.tsx` -- Mostrar total sempre

## Zero Regressao

- Export ja usa +1 dia, nao e alterado
- RPC nao muda (ja usa `< p_end`)
- Paginacao continua igual
- Filtros continuam funcionando

